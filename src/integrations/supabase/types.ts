export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// NOTE: Permissive fallback schema.
// The database schema is still mid-migration, so the generated types would be
// incomplete and break the build. Typing the schema loosely keeps the app
// compiling and running until the full schema is applied and types regenerated.
export type Database = any

export type Tables<T extends string = string> = any
export type TablesInsert<T extends string = string> = any
export type TablesUpdate<T extends string = string> = any
export type Enums<T extends string = string> = string
export type CompositeTypes<T extends string = string> = any

export const Constants = {
  public: {
    Enums: {},
  },
} as const
