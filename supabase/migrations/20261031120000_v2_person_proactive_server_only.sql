-- ============================================================================
-- Kinship 2.0 — person_proactive is for server readers only
-- ============================================================================
-- Additive and forward-only. person_proactive(person, user) (trust floor,
-- 20261030090000) is SECURITY DEFINER and takes the user id as an argument, so
-- a signed-in caller could ask it about any account's person id and learn,
-- past row-level security, whether that person exists and is active. No
-- signed-in path calls it: it answers D13 for server readers (candidate
-- engines run as the service role). Signed-in users lose EXECUTE; the service
-- role keeps it.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.person_proactive(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.person_proactive(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.person_proactive(uuid, uuid) TO service_role;
