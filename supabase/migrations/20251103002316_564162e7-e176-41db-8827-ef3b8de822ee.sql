-- Enable realtime for user_badges table
ALTER TABLE user_badges REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;