const express = require("express");

const { scrapeAllPages, chunkContent } = require("../utils/scraper");
const { generateEmbeddings, upsertVectors } = require("../utils/embeddings");

const router = express.Router();

/**
 * POST /api/scrape
 * Scrape all target pages, generate embeddings, and store in Pinecone
 */
router.post("/", async (req, res) => {
  try {
    console.log("Starting scrape process...");

    // Step 1: Scrape all pages
    const scrapeResults = await scrapeAllPages();

    if (scrapeResults.successCount === 0) {
      return res.status(400).json({
        error: "No pages were successfully scraped",
        details: scrapeResults.failed,
      });
    }

    // Step 2: Process successful scrapes
    const allVectors = [];
    let totalChunks = 0;

    for (const pageContent of scrapeResults.successful) {
      // Chunk the content
      const chunks = chunkContent(pageContent.content, 1000, 100);
      totalChunks += chunks.length;

      console.log(
        `Processing ${chunks.length} chunks for ${pageContent.label}`
      );

      // Generate embeddings for chunks
      const embeddings = await generateEmbeddings(chunks);

      // Create vector objects for Pinecone
      for (let i = 0; i < chunks.length; i++) {
        const vectorId = `${pageContent.hash}_chunk_${i}`;
        allVectors.push({
          id: vectorId,
          values: embeddings[i],
          metadata: {
            url: pageContent.url,
            label: pageContent.label,
            hash: pageContent.hash,
            chunkIndex: i,
            totalChunks: chunks.length,
            content: chunks[i],
            scrapedAt: pageContent.scrapedAt,
            wordCount: chunks[i].split(" ").length,
          },
        });
      }
    }

    // Step 3: Upsert to Pinecone
    console.log(`Upserting ${allVectors.length} vectors to Pinecone...`);
    const upsertResults = await upsertVectors(allVectors);

    // Prepare response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      scrapeResults: {
        totalPages: scrapeResults.totalAttempted,
        successful: scrapeResults.successCount,
        failed: scrapeResults.failureCount,
        failedPages: scrapeResults.failed,
      },
      processing: {
        totalChunks,
        totalVectors: allVectors.length,
      },
      pinecone: upsertResults,
      message: `Successfully processed ${scrapeResults.successCount} pages into ${totalChunks} chunks`,
    };

    console.log("Scrape process completed successfully");
    res.json(response);
  } catch (error) {
    console.error("Scrape process failed:", error);
    res.status(500).json({
      error: "Scrape process failed",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
