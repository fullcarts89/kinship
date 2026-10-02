-- ============================================================================
-- Kinship — RLS hardening (P0-13)
-- ============================================================================
-- 1. Every policy now targets the `authenticated` role only (anon gets no
--    policy at all) and evaluates auth.uid() once per statement via
--    (select auth.uid()) instead of once per row.
-- 2. UPDATE policies get an explicit WITH CHECK, so a row can't be handed to
--    another user by rewriting user_id.
-- 3. Parent ownership: a memory, interaction, promise or season commitment
--    may only point at a person (and season) owned by the same user. Before
--    this, a user could attach rows to someone else's person_id if they knew
--    or guessed it.
-- 4. rls_auto_enable() (the platform's event-trigger function) is no longer
--    executable through the API by anon or authenticated users.
--
-- Uses ALTER POLICY rather than drop-and-recreate, so policy names and the
-- set of policies are unchanged and there is no window without a policy.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- persons ───────────────────────────────────────────────────────────────
ALTER POLICY "Users can view own persons" ON public.persons
  TO authenticated USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own persons" ON public.persons
  TO authenticated WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own persons" ON public.persons
  TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own persons" ON public.persons
  TO authenticated USING ((select auth.uid()) = user_id);

-- memories ──────────────────────────────────────────────────────────────
ALTER POLICY "Users can view own memories" ON public.memories
  TO authenticated USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own memories" ON public.memories
  TO authenticated WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = (select auth.uid())));
ALTER POLICY "Users can update own memories" ON public.memories
  TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = (select auth.uid())));
ALTER POLICY "Users can delete own memories" ON public.memories
  TO authenticated USING ((select auth.uid()) = user_id);

-- interactions ──────────────────────────────────────────────────────────
ALTER POLICY "Users can view own interactions" ON public.interactions
  TO authenticated USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own interactions" ON public.interactions
  TO authenticated WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = (select auth.uid())));
ALTER POLICY "Users can update own interactions" ON public.interactions
  TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = (select auth.uid())));
ALTER POLICY "Users can delete own interactions" ON public.interactions
  TO authenticated USING ((select auth.uid()) = user_id);

-- promises ──────────────────────────────────────────────────────────────
ALTER POLICY "Users can view own promises" ON public.promises
  TO authenticated USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own promises" ON public.promises
  TO authenticated WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = (select auth.uid())));
ALTER POLICY "Users can update own promises" ON public.promises
  TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = (select auth.uid())));
ALTER POLICY "Users can delete own promises" ON public.promises
  TO authenticated USING ((select auth.uid()) = user_id);

-- seasons ───────────────────────────────────────────────────────────────
ALTER POLICY "Users manage own seasons" ON public.seasons
  TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- season_commitments ───────────────────────────────────────────────────
ALTER POLICY "Users manage own season commitments" ON public.season_commitments
  TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = (select auth.uid())) AND EXISTS (SELECT 1 FROM public.seasons s WHERE s.id = season_id AND s.user_id = (select auth.uid())));
