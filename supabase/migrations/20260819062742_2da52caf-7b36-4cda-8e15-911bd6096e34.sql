
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_match_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_match_party(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_match_carrier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_match_party(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_match_carrier(uuid) TO authenticated;
