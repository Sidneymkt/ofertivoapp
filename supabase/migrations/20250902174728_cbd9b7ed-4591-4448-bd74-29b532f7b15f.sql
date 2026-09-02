-- Enable realtime for check-in and activity tables
ALTER PUBLICATION supabase_realtime ADD TABLE checkin_validations;
ALTER PUBLICATION supabase_realtime ADD TABLE offer_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE user_points;
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE validation_analytics;

-- Set replica identity full for better realtime updates
ALTER TABLE checkin_validations REPLICA IDENTITY FULL;
ALTER TABLE offer_checkins REPLICA IDENTITY FULL;
ALTER TABLE user_points REPLICA IDENTITY FULL;
ALTER TABLE offers REPLICA IDENTITY FULL;
ALTER TABLE validation_analytics REPLICA IDENTITY FULL;