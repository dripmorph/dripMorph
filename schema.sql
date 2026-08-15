-- ============================================================================
-- DripMorph - Supabase Database Schema
-- Tables: profiles, outfits, outfit_ratings, outfit_products,
--         outfit_likes, outfit_comments
-- Last updated: 2026-08-15
-- ============================================================================

-- 1. Create public.profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  city TEXT,
  height TEXT,
  gender TEXT,
  instagram_link TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Create public.outfits table
CREATE TABLE IF NOT EXISTS public.outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  city TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for outfits
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public outfits are viewable by everyone"
  ON public.outfits FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own outfits"
  ON public.outfits FOR INSERT
  WITH CHECK (auth.uid() = poster_id);

CREATE POLICY "Users can delete their own outfits"
  ON public.outfits FOR DELETE
  USING (auth.uid() = poster_id);

-- 3. Create public.outfit_ratings table
CREATE TABLE IF NOT EXISTS public.outfit_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  color_harmony NUMERIC(4, 2) NOT NULL,
  silhouette_proportions NUMERIC(4, 2) NOT NULL,
  coherence_styling NUMERIC(4, 2) NOT NULL,
  overall NUMERIC(4, 2) NOT NULL,
  summary TEXT,
  improvement_tip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for outfit_ratings
ALTER TABLE public.outfit_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public ratings are viewable by everyone"
  ON public.outfit_ratings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert ratings"
  ON public.outfit_ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

-- 4. Create public.outfit_products table (Tagged Affiliate Items)
CREATE TABLE IF NOT EXISTS public.outfit_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE NOT NULL,
  category TEXT,
  name TEXT NOT NULL,
  price TEXT,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for outfit_products
ALTER TABLE public.outfit_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public outfit products are viewable by everyone"
  ON public.outfit_products FOR SELECT
  USING (true);

CREATE POLICY "Users can insert products for their own outfits"
  ON public.outfit_products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outfits WHERE id = outfit_id AND poster_id = auth.uid()
    )
  );

-- 5. Create public.outfit_likes table
CREATE TABLE IF NOT EXISTS public.outfit_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (outfit_id, user_id)
);

-- Enable RLS for outfit_likes
ALTER TABLE public.outfit_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON public.outfit_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like outfits"
  ON public.outfit_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.outfit_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create public.outfit_comments table
CREATE TABLE IF NOT EXISTS public.outfit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for outfit_comments
ALTER TABLE public.outfit_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON public.outfit_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post comments"
  ON public.outfit_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.outfit_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Postgres Triggers

-- handle_new_user: auto-creates a profile row on auth.users INSERT
-- NOTE: INSERT omits updated_at (no such column needed in the trigger flow)
--       ON CONFLICT (id) DO UPDATE only refreshes avatar_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_name TEXT;
  base_username TEXT;
  final_username TEXT;
  counter INT := 1;
BEGIN
  -- Extract raw username from metadata or email prefix
  raw_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(split_part(NEW.email, '@', 1)), ''),
    'user'
  );

  -- Strip leading '@' symbols and whitespace
  raw_name := LTRIM(raw_name, '@');

  -- Fallback if stripping '@' left string empty
  IF raw_name IS NULL OR length(trim(raw_name)) = 0 THEN
    raw_name := 'user';
  END IF;

  base_username := lower(trim(raw_name));
  final_username := base_username;

  -- Loop to guarantee unique username (case-insensitive check)
  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(final_username)
      AND id != NEW.id
  ) LOOP
    final_username := base_username || counter::text;
    counter := counter + 1;
  END LOOP;

  -- Insert profile row; on conflict (same id) only update avatar_url
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    created_at
  )
  VALUES (
    NEW.id,
    final_username,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop'
    ),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = EXCLUDED.avatar_url;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user trigger encountered an error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- set_updated_at: keeps updated_at fresh on profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
