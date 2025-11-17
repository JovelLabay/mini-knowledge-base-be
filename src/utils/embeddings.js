const openai = require("../config/openai");
const { getIndex } = require("../config/pinecone");

/**
 * Generate embeddings for text using OpenAI
 * @param {string} text - Text to embed
 * @returns {Array} - Embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text.substring(0, 8000), // Limit text length for API
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts
 * @param {Array} texts - Array of texts to embed
 * @returns {Array} - Array of embedding vectors
 */
async function generateEmbeddings(texts) {
  const embeddings = [];

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map((text) => generateEmbedding(text));

    try {
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);

      // Small delay to avoid rate limiting
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error in batch ${i}-${i + batchSize}:`, error);
      throw error;
    }
  }

  return embeddings;
}

/**
 * Upsert vectors to Pinecone with deduplication
 * @param {Array} vectors - Array of vector objects
 * @returns {Object} - Upsert results
 */
async function upsertVectors(vectors) {
  try {
    const index = await getIndex();

    // Check for existing vectors by hash to deduplicate
    const existingIds = [];
    for (const vector of vectors) {
      try {
        const queryResponse = await index.query({
          vector: vector.values,
          topK: 1,
          includeMetadata: true,
          filter: { hash: vector.metadata.hash },
        });

        if (queryResponse.matches && queryResponse.matches.length > 0) {
          existingIds.push(vector.id);
        }
      } catch (error) {
        // If query fails, we'll still try to upsert (better to have duplicates than missing data)
        console.warn(
          `Could not check for existing vector ${vector.id}:`,
          error.message
        );
      }
    }

    // Filter out existing vectors
    const newVectors = vectors.filter((v) => !existingIds.includes(v.id));

    if (newVectors.length === 0) {
      return {
        upserted: 0,
        skipped: existingIds.length,
        message: "All vectors already exist",
      };
    }

    // Upsert new vectors
    const upsertResponse = await index.upsert(newVectors);

    return {
      upserted: newVectors.length,
      skipped: existingIds.length,
      response: upsertResponse,
    };
  } catch (error) {
    console.error("Error upserting vectors:", error);
    throw new Error(`Failed to upsert vectors: ${error.message}`);
  }
}

/**
 * Search for similar vectors in Pinecone
 * @param {string} query - Search query text
 * @param {number} topK - Number of results to return
 * @returns {Array} - Search results
 */
async function searchSimilarVectors(query, topK = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const index = await getIndex();

    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      includeValues: false,
    });

    return searchResponse.matches || [];
  } catch (error) {
    console.error("Error searching vectors:", error);
    throw new Error(`Failed to search vectors: ${error.message}`);
  }
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  upsertVectors,
  searchSimilarVectors,
};
