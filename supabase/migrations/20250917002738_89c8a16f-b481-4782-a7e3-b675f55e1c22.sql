-- Add foreign key relationships that are missing for proper Supabase joins

-- Add foreign key from reviews.user_id to profiles.user_id
ALTER TABLE reviews 
ADD CONSTRAINT reviews_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) 
ON DELETE CASCADE;