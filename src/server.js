const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const scrapeRoutes = require("./routes/scrape");
const chatRoutes = require("./routes/chat");
const historyRoutes = require("./routes/history");

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

// API Routes
app.use("/api/scrape", scrapeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/history", historyRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Mini Knowledge Base Assistant API",
  });
});

// Generic route
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

// Server logs
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
