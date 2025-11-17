-- Create the chat_history table for storing chat interactions
CREATE TABLE chat_history (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  chunks_used INTEGER DEFAULT 0,
  is_simple_response BOOLEAN DEFAULT false
);

-- Create an index on timestamp for faster queries
CREATE INDEX idx_chat_history_timestamp ON chat_history(timestamp DESC);

-- Create an index on question for search capabilities (optional)
CREATE INDEX idx_chat_history_question ON chat_history USING GIN(to_tsvector('english', question));

-- Add Row Level Security (optional, for multi-user scenarios)
-- ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Sample query to verify the table
-- SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT 10;