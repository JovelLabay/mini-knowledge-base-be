// Lazy load Pinecone to avoid web API issues during module import
let Pinecone;
let pinecone;
let pineconeInitialized = false;

const initializePinecone = () => {
  if (pineconeInitialized) return pinecone;

  try {
    // Check if required environment variables are set
    if (!process.env.PINECONE_API_KEY) {
      console.warn("⚠️ PINECONE_API_KEY environment variable is not set");
      return null;
    }
    if (!process.env.PINECONE_INDEX_NAME) {
      console.warn("⚠️ PINECONE_INDEX_NAME environment variable is not set");
      return null;
    }

    // Lazy load the Pinecone class
    if (!Pinecone) {
      Pinecone = require("@pinecone-database/pinecone").Pinecone;
    }

    // Initialize Pinecone
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    console.log("✅ Pinecone client initialized successfully");
    pineconeInitialized = true;
    return pinecone;
  } catch (error) {
    console.error("❌ Error initializing Pinecone:", error.message);
    pineconeInitialized = true; // Don't keep retrying
    return null;
  }
};

const getIndex = async () => {
  try {
    const client = initializePinecone();

    if (!client) {
      throw new Error(
        "Pinecone client not initialized. Please check your PINECONE_API_KEY and PINECONE_INDEX_NAME environment variables."
      );
    }

    const index = client.index(process.env.PINECONE_INDEX_NAME);

    // Test the connection with a simple stats call
    try {
      const stats = await index.describeIndexStats();
      console.log(
        `✅ Connected to Pinecone index: ${process.env.PINECONE_INDEX_NAME} (${
          stats.totalVectorCount || 0
        } vectors)`
      );
    } catch {
      console.log(
        `✅ Connected to Pinecone index: ${process.env.PINECONE_INDEX_NAME} (stats unavailable)`
      );
    }

    return index;
  } catch (error) {
    console.error("❌ Error connecting to Pinecone index:", error.message);
    throw new Error(`Pinecone connection failed: ${error.message}`);
  }
};

module.exports = { pinecone, getIndex };
