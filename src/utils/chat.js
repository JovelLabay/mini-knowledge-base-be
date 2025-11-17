const openai = require("../config/openai");
const { searchSimilarVectors } = require("./embeddings");

/**
 * Generate response using RAG (Retrieval Augmented Generation)
 * @param {string} question - User's question
 * @param {number} maxResults - Maximum number of context chunks to retrieve
 * @returns {Object} - Response with answer and sources
 */
async function generateRAGResponse(question, maxResults = 5) {
  try {
    console.log(`Generating RAG response for: "${question}"`);

    // Step 1: Retrieve relevant context from Pinecone
    const similarChunks = await searchSimilarVectors(question, maxResults);

    if (!similarChunks || similarChunks.length === 0) {
      return {
        answer:
          "I don't have enough information to answer that question. Please make sure the knowledge base has been populated by running the scrape endpoint first.",
        sources: [],
        confidence: 0,
      };
    }

    // Step 2: Prepare context from retrieved chunks
    const context = similarChunks
      .filter((chunk) => chunk.score > 0.7) // Only use high-confidence matches
      .map((chunk, index) => {
        return `[${index + 1}] ${chunk.metadata.label} (${
          chunk.metadata.url
        }):\n${chunk.metadata.content}`;
      })
      .join("\n\n");

    if (!context.trim()) {
      return {
        answer:
          "I couldn't find relevant information to answer your question. The available information might not cover this topic.",
        sources: [],
        confidence: 0,
      };
    }

    // Step 3: Generate response using OpenAI
    const systemPrompt = `You are a helpful assistant that answers questions about cruise destinations based ONLY on the provided context. 

IMPORTANT RULES:
1. Only use information from the provided context
2. If the context doesn't contain enough information to answer the question, say so
3. Always cite your sources using the format [1], [2], etc. that correspond to the numbered context items
4. Be concise but comprehensive
5. Focus on cruise-related information for the mentioned destinations
6. If asked about destinations not covered in the context, clearly state that you don't have information about them

Context:
${context}`;

    const userPrompt = `Question: ${question}

Please provide a helpful answer based only on the context provided above. Include source citations in your response.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const answer = completion.choices[0].message.content;

    // Step 4: Extract sources from the chunks used
    const sources = similarChunks
      .filter((chunk) => chunk.score > 0.7)
      .map((chunk) => ({
        url: chunk.metadata.url,
        label: chunk.metadata.label,
        score: chunk.score,
      }))
      // Remove duplicates by URL
      .filter(
        (source, index, self) =>
          index === self.findIndex((s) => s.url === source.url)
      );

    return {
      answer,
      sources,
      confidence: similarChunks[0]?.score || 0,
      chunksUsed: similarChunks.length,
      contextLength: context.length,
    };
  } catch (error) {
    console.error("Error generating RAG response:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

/**
 * Simple chat completion without RAG (fallback)
 * @param {string} question - User's question
 * @returns {Object} - Simple response
 */
async function generateSimpleResponse(question) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. However, you should inform the user that you don't have access to the specific cruise destination knowledge base and suggest they ensure the data has been scraped first.",
        },
        { role: "user", content: question },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return {
      answer: completion.choices[0].message.content,
      sources: [],
      confidence: 0,
      isSimpleResponse: true,
    };
  } catch (error) {
    console.error("Error generating simple response:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

module.exports = {
  generateRAGResponse,
  generateSimpleResponse,
};
