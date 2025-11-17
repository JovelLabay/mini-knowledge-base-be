const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
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
let routeError = null;

try {
  const historyRoutes = require("../src/routes/history");
  app.use("/api/history", historyRoutes);

  const scrapeRoutes = require("../src/routes/scrape");
  app.use("/api/scrape", scrapeRoutes);

  const chatRoutes = require("../src/routes/chat");
  app.use("/api/chat", chatRoutes);

  routesLoaded = true;
} catch (error) {
  routeError = error;
  console.error("Error loading routes:", error.message);
  console.error("Stack trace:", error.stack);
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Mini Knowledge Base Assistant API",
  });
});

// Root route
app.get("*", (req, res) => {
  res.json({
    status: 200,
    message: "Welcome to the Mini Knowledge Base Assistant API",
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
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at /api/health`);
});
