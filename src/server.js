const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware (must come before routes)
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.FRONTEND_URL].filter(Boolean)
        : true,
    credentials: true,
  })
);
app.use(express.json());

// Initialize routes with error handling
let routesLoaded = false;
let routeError = null;

try {
  const scrapeRoutes = require("./routes/scrape");
  const chatRoutes = require("./routes/chat");
  const historyRoutes = require("./routes/history");

  // API Routes
  app.use("/api/scrape", scrapeRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/history", historyRoutes);

  routesLoaded = true;
  console.log("✅ Routes loaded successfully");
} catch (error) {
  routeError = error;
  console.error("❌ Error loading routes:", error.message);
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Mini Knowledge Base Assistant API",
    routes: routesLoaded ? "loaded" : "failed",
    error: routeError ? routeError.message : null,
    env: {
      nodeEnv: process.env.NODE_ENV,
      port: PORT,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasPinecone: !!process.env.PINECONE_API_KEY,
      hasSupabase: !!process.env.SUPABASE_URL,
    },
  });
});

// Root route
app.get("*", (req, res) => {
  res.json({
    status: 200,
    message: "Welcome to the Mini Knowledge Base Assistant API",
    endpoints: [
      "GET /api/health - Health check",
      "GET /api/scrape/status - Scrape configuration",
      "POST /api/scrape - Scrape and index pages",
      "POST /api/chat - Chat with AI",
      "GET /api/history - Get chat history",
    ],
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

if (routeError) {
  console.error("Route loading error:", routeError.message);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🏥 Health check available at /api/health`);
});
