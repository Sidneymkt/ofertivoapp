# Finish Cloud enablement and schema migration

## Current state
- Lovable Cloud is enabled and healthy for project `ofaxkyojoyefkoazydte`.
- The first baseline migration (core tables: profiles, businesses, offers, user_points, favorites, follows, reviews, qr_codes, raffles, raffle_entries) is applied.
- Three security-hardening migrations are applied to fix `search_path` and `SECURITY DEFINER` execution grants.
- `src/integrations/supabase/types.ts` was overwritten with a permissive hand-built schema (78 tables, 2 views, 99 functions) so TypeScript and Vite builds pass.
- The home page renders without console errors.

## Remaining work
- 215 repository migrations (≈18,400 lines) are not yet applied to the new database.
- Runtime queries that reference tables/columns/functions added in those migrations will fail until they are applied.
- The permissive `types.ts` should be replaced by the official generated schema once the migrations are applied.

## Plan
1. Apply the remaining 215 migrations in 19 sequential batches (the existing `/tmp/batches_remaining/batch_aa` through `batch_as` groupings, each ≈1,000 lines).
2. After each batch, run the database linter and fix any security/policy warnings it raises.
3. Once all batches are applied, regenerate `src/integrations/supabase/types.ts` from the live schema if possible, or keep the permissive schema if official generation is still blocked.
4. Verify the TypeScript build and Vite build still pass.
5. Smoke-test the home page and key routes for console/database errors.

## Why sequential batches
The migration tool accepts a single SQL string. The remaining SQL is too large for one call, so I will apply it in the same chunks already prepared, preserving migration order and dependencies.

## Risks
- Batches may fail on ordering/dependency issues or because the new database is empty relative to the repo's later migrations. I will fix these by patching and retrying the failed batch.
- Some old migrations may reference objects that no longer exist or have been renamed; I will resolve those as they appear.
