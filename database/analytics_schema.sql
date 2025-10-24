-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  url TEXT,
  path TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Sessions Table
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);
CREATE INDEX IF NOT EXISTS idx_analytics_events_active ON analytics_events(is_active);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_active ON analytics_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_activity ON analytics_sessions(last_activity DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for analytics_sessions
DROP TRIGGER IF EXISTS update_analytics_sessions_updated_at ON analytics_sessions;
CREATE TRIGGER update_analytics_sessions_updated_at
    BEFORE UPDATE ON analytics_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a function to clean up old events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_events
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Mark inactive sessions (no activity in last 30 minutes)
CREATE OR REPLACE FUNCTION mark_inactive_sessions()
RETURNS void AS $$
BEGIN
    UPDATE analytics_sessions
    SET is_active = false
    WHERE last_activity < NOW() - INTERVAL '30 minutes'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;
