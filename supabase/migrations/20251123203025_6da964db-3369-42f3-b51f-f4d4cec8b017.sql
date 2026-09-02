-- Drop the old policy
DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;

-- Create new policy that allows both chat participants to send messages
CREATE POLICY "Users can send messages to their chats" ON messages
FOR INSERT
WITH CHECK (
  chat_id IN (
    SELECT chats.id
    FROM chats
    WHERE (
      chats.user_id = auth.uid() 
      OR chats.target_user_id = auth.uid()
      OR chats.business_id IN (
        SELECT businesses.id
        FROM businesses
        WHERE businesses.owner_id = auth.uid()
      )
    )
  )
);

-- Also update the view policy to ensure both users can see messages
DROP POLICY IF EXISTS "Users can view messages from their chats" ON messages;

CREATE POLICY "Users can view messages from their chats" ON messages
FOR SELECT
USING (
  chat_id IN (
    SELECT chats.id
    FROM chats
    WHERE (
      chats.user_id = auth.uid()
      OR chats.target_user_id = auth.uid()
      OR chats.business_id IN (
        SELECT businesses.id
        FROM businesses
        WHERE businesses.owner_id = auth.uid()
      )
    )
  )
);

-- Update the mark as read policy
DROP POLICY IF EXISTS "Users can mark their messages as read" ON messages;

CREATE POLICY "Users can mark their messages as read" ON messages
FOR UPDATE
USING (
  chat_id IN (
    SELECT chats.id
    FROM chats
    WHERE (
      chats.user_id = auth.uid()
      OR chats.target_user_id = auth.uid()
      OR chats.business_id IN (
        SELECT businesses.id
        FROM businesses
        WHERE businesses.owner_id = auth.uid()
      )
    )
  )
);