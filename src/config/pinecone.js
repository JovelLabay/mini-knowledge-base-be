const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize Pinecone with proper error handling
let pinecone;

try {
  // Check if required environment variables are set
  if (!process.env.PINECONE_API_KEY) {
    console.warn('⚠️ PINECONE_API_KEY environment variable is not set');
  } else if (!process.env.PINECONE_INDEX_NAME) {
    console.warn('⚠️ PINECONE_INDEX_NAME environment variable is not set');
  } else {
    // Initialize Pinecone with the latest SDK
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    console.log('✅ Pinecone client initialized successfully');
  }
} catch (error) {
  console.error('❌ Error initializing Pinecone:', error.message);
  // Don't throw here - let the getIndex function handle it
}

const getIndex = async () => {
  try {
    if (!pinecone) {
      throw new Error('Pinecone client not initialized. Please check your PINECONE_API_KEY and PINECONE_INDEX_NAME environment variables.');
    }
    
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    
    // Test the connection with a simple stats call
    try {
      const stats = await index.describeIndexStats();
      console.log(`✅ Connected to Pinecone index: ${process.env.PINECONE_INDEX_NAME} (${stats.totalVectorCount || 0} vectors)`);
    } catch (statsError) {
      console.log(`✅ Connected to Pinecone index: ${process.env.PINECONE_INDEX_NAME} (stats unavailable)`);
    }
    
    return index;
  } catch (error) {
    console.error("❌ Error connecting to Pinecone index:", error.message);
    throw new Error(`Pinecone connection failed: ${error.message}`);
  }
};

module.exports = { pinecone, getIndex };
