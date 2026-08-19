DROP POLICY IF EXISTS listing_photos_insert ON storage.objects;
CREATE POLICY listing_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

REVOKE EXECUTE ON FUNCTION public.is_match_party(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_match_carrier(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_match_status() FROM authenticated, anon, public;