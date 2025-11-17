const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

/**
 * GET /api/history
 * Get the last 50 chat interactions from Supabase
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching chat history:", error);
      return res.status(500).json({
        error: "Failed to fetch chat history",
        message: error.message,
      });
    }

    res.json({
      success: true,
      history: data || [],
      count: data?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("History request failed:", error);
    res.status(500).json({
      error: "Failed to fetch chat history",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/history
 * Clear chat history (optional endpoint for management)
 */
router.delete("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("chat_history")
      .delete()
      .neq("id", 0); // Delete all records

    if (error) {
      console.error("Error clearing chat history:", error);
      return res.status(500).json({
        error: "Failed to clear chat history",
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "Chat history cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Clear history request failed:", error);
    res.status(500).json({
      error: "Failed to clear chat history",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
