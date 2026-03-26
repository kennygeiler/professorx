-- Auto-update search_vector on tweet insert/update

CREATE OR REPLACE FUNCTION update_tweet_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.text_content, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.author_handle, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.author_display_name, '')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tweet_search_vector
  BEFORE INSERT OR UPDATE OF text_content, author_handle, author_display_name
  ON public.tweets
  FOR EACH ROW
  EXECUTE FUNCTION update_tweet_search_vector();
