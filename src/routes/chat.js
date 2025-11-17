const express = require("express");
const {
  generateRAGResponse,
  generateSimpleResponse,
} = require("../utils/chat");
const supabase = require("../config/supabase");

const router = express.Router();

/**
 * POST /api/chat
 * Handle chat requests with RAG
 */
router.post("/", async (req, res) => {
  try {
    const { question } = req.body;

    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return res.status(400).json({
        error: "Question is required and must be a non-empty string",
      });
    }

    const trimmedQuestion = question.trim();
    console.log(`Processing chat request: "${trimmedQuestion}"`);

    let response;

    try {
      // Try RAG response first
      response = await generateRAGResponse(trimmedQuestion);
    } catch (error) {
      console.warn(
        "RAG response failed, falling back to simple response:",
        error.message
      );
      // Fallback to simple response if RAG fails
      response = await generateSimpleResponse(trimmedQuestion);
    }

    // Prepare chat record for database
    const chatRecord = {
      question: trimmedQuestion,
      answer: response.answer,
      sources: response.sources || [],
      confidence: response.confidence || 0,
      timestamp: new Date().toISOString(),
      chunks_used: response.chunksUsed || 0,
      is_simple_response: response.isSimpleResponse || false,
    };

    // Save to Supabase
    try {
      const { data, error } = await supabase
        .from("chat_history")
        .insert([chatRecord])
        .select();

      if (error) {
        console.error("Failed to save chat to database:", error);
        // Continue with response even if DB save fails
      } else {
        console.log("Chat saved to database:", data);
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Continue with response even if DB save fails
    }

    // Return response
    const responseData = {
      success: true,
      question: trimmedQuestion,
      answer: response.answer,
      sources: response.sources || [],
      metadata: {
        confidence: response.confidence || 0,
        chunksUsed: response.chunksUsed || 0,
        isSimpleResponse: response.isSimpleResponse || false,
        timestamp: new Date().toISOString(),
      },
    };

    res.json(responseData);
  } catch (error) {
    console.error("Chat request failed:", error);
    res.status(500).json({
      error: "Failed to process chat request",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
