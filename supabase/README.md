# Supabase (cloud)

Built in milestone 8:

- `migrations/` — the same tables as `apps/api/src/db/migrations`, plus Row Level Security policies so each
  member can read only their own rows from the member portal.
- `seed.sql` — cloud reference data.

Use the Supabase CLI: `supabase link`, then `supabase db push`.
