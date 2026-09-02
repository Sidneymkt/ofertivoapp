-- Add foreign key constraints for proper relationships

-- Add foreign key constraint between raffle_entries and auth.users
ALTER TABLE public.raffle_entries 
ADD CONSTRAINT raffle_entries_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraint between raffle_entries and raffles  
ALTER TABLE public.raffle_entries 
ADD CONSTRAINT raffle_entries_raffle_id_fkey 
FOREIGN KEY (raffle_id) REFERENCES public.raffles(id) ON DELETE CASCADE;

-- Add foreign key constraint between profiles and auth.users (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_user_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;