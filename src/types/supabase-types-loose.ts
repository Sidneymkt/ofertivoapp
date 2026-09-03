// Type-only shim for "@/integrations/supabase/types" while the schema migration
// is in progress. See supabase-client-loose.ts.
export type Json = any;
export type Database = any;
export type Tables<T extends string = string> = any;
export type TablesInsert<T extends string = string> = any;
export type TablesUpdate<T extends string = string> = any;
export type Enums<T extends string = string> = string;
export type CompositeTypes<T extends string = string> = any;
export const Constants = { public: { Enums: {} } } as const;
