-- Drop the existing constraint (not index) first
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Drop redundant index
DROP INDEX IF EXISTS public.idx_profiles_username;

-- Create a case-insensitive unique index to prevent "LDAS2" vs "ldas2" conflicts
CREATE UNIQUE INDEX profiles_username_unique_ci ON public.profiles (LOWER(username));
