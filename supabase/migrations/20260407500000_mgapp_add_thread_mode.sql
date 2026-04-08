-- Add mode column to ai_threads to distinguish chat vs mgapp threads
ALTER TABLE ai_threads ADD COLUMN mode VARCHAR(20) NOT NULL DEFAULT 'chat';
ALTER TABLE ai_threads ADD CONSTRAINT ai_threads_mode_check CHECK (mode IN ('chat', 'mgapp'));
CREATE INDEX idx_ai_threads_mode ON ai_threads(mode);
