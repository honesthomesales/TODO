-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add assignee column to todos table if it doesn't exist
ALTER TABLE todos ADD COLUMN IF NOT EXISTS assignee UUID REFERENCES team_members(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_name ON team_members(name);
CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assignee);

-- Insert some sample team members (optional)
INSERT INTO team_members (id, name, email) VALUES 
  (gen_random_uuid(), 'John Doe', 'john@example.com'),
  (gen_random_uuid(), 'Jane Smith', 'jane@example.com'),
  (gen_random_uuid(), 'Mike Johnson', 'mike@example.com')
ON CONFLICT (email) DO NOTHING; 