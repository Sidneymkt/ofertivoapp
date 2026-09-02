
-- Daily missions completion tracking
CREATE TABLE public.daily_mission_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_key TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE public.daily_mission_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view own mission completions"
ON public.daily_mission_completions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own mission completions"
ON public.daily_mission_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Unique constraint: one mission per user per day
CREATE UNIQUE INDEX idx_daily_mission_unique ON public.daily_mission_completions (user_id, mission_key, mission_date);

-- Index for efficient queries
CREATE INDEX idx_daily_missions_user_date ON public.daily_mission_completions (user_id, mission_date);
