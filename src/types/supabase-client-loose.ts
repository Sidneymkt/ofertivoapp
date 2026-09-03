// Type-only shim: the database schema is still mid-migration, so the generated
// Supabase types don't yet include every table the app queries. tsconfig maps
// "@/integrations/supabase/client" here so TypeScript sees a loosely typed
// client. At runtime Vite resolves the real client module.
import { supabase as typedSupabase } from '../integrations/supabase/client';

export const supabase = typedSupabase as any;
