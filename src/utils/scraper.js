const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");

// Target URLs to scrape
const PAGES_TO_SCRAPE = [
  {
    url: "https://www.shermanstravel.com/cruise-destinations/alaska-itineraries",
    label: "Alaska",
  },
  {
    url: "https://www.shermanstravel.com/cruise-destinations/caribbean-and-bahamas",
    label: "Caribbean & Bahamas",
  },
  {
    url: "https://www.shermanstravel.com/cruise-destinations/hawaiian-islands",
    label: "Hawaiian Islands",
  },
  {
    url: "https://www.shermanstravel.com/cruise-destinations/northern-europe",
    label: "Northern Europe",
  },
];

/**
 * Scrape a single page and extract clean text content
 * @param {string} url - The URL to scrape
 * @param {string} label - The label for this page
 * @returns {Object} - Scraped content with metadata
 */
async function scrapePage(url, label) {
  try {
    console.log(`Scraping: ${url}`);

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $(
      "script, style, nav, footer, header, .advertisement, .ad, .popup, .modal"
    ).remove();

    // Extract main content - target common content areas
    const contentSelectors = [
      "main",
      ".content",
      ".main-content",
      "article",
      ".article-content",
      ".post-content",
      ".entry-content",
      "body",
    ];

    let mainContent = "";

    for (const selector of contentSelectors) {
      const content = $(selector).first();
      if (content.length > 0) {
        mainContent = content.text();
        break;
      }
    }

    // Fallback to body if no main content found
    if (!mainContent) {
      mainContent = $("body").text();
    }

    // Clean the text
    const cleanedContent = mainContent
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .replace(/\n+/g, " ") // Replace newlines with space
      .trim();

    // Generate a hash for deduplication
    const contentHash = crypto
      .createHash("md5")
      .update(url + cleanedContent)
      .digest("hex");

    return {
      url,
      label,
      content: cleanedContent,
      hash: contentHash,
      scrapedAt: new Date().toISOString(),
      wordCount: cleanedContent.split(" ").length,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  }
}

/**
 * Scrape all target pages
 * @returns {Array} - Array of scraped content objects
 */
async function scrapeAllPages() {
  const results = [];
  const errors = [];

  for (const page of PAGES_TO_SCRAPE) {
    try {
      const content = await scrapePage(page.url, page.label);
      results.push(content);
    } catch (error) {
      errors.push({
        url: page.url,
        label: page.label,
        error: error.message,
      });
    }
  }

  return {
    successful: results,
    failed: errors,
    totalAttempted: PAGES_TO_SCRAPE.length,
    successCount: results.length,
    failureCount: errors.length,
  };
}

/**
 * Chunk text content into smaller pieces for embedding
 * @param {string} content - The text content to chunk
 * @param {number} chunkSize - Maximum characters per chunk
 * @param {number} overlap - Overlap between chunks
 * @returns {Array} - Array of text chunks
 */
function chunkContent(content, chunkSize = 1000, overlap = 100) {
  const chunks = [];

  if (content.length <= chunkSize) {
    return [content];
  }

  for (let i = 0; i < content.length; i += chunkSize - overlap) {
    const chunk = content.slice(i, i + chunkSize);
    chunks.push(chunk);

    // Break if we've reached the end
    if (i + chunkSize >= content.length) {
      break;
    }
  }

  return chunks;
}

module.exports = {
  PAGES_TO_SCRAPE,
  scrapePage,
  scrapeAllPages,
  chunkContent,
};
