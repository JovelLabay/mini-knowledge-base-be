const { PineconeClient } = require("@pinecone-database/pinecone");

// Initialize Pinecone with older SDK (v2.2.2) compatible with Node.js 18
let pinecone;

const initializePinecone = async () => {
  if (pinecone) return pinecone;

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

    // Initialize Pinecone with v2 SDK syntax
    pinecone = new PineconeClient();
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT || "gcp-starter",
    });

    console.log("✅ Pinecone client initialized successfully");
    return pinecone;
  } catch (error) {
    console.error("❌ Error initializing Pinecone:", error.message);
    return null;
  }
};

const getIndex = async () => {
  try {
    const client = await initializePinecone();

    if (!client) {
      throw new Error(
        "Pinecone client not initialized. Please check your PINECONE_API_KEY and PINECONE_INDEX_NAME environment variables."
      );
    }

    const index = client.Index(process.env.PINECONE_INDEX_NAME);

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
