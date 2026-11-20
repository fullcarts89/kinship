# CMR-1 native pass on a Mac (founder, 20 Nov 2026)

**Status: PLANNED, NOT RUN.** The founder chose a Maestro run on a Mac over an EAS upgrade, and will do the
iPhone voice test themselves. Nothing here touches production. It needs the RC's own Supabase preview branch;
see "Before you start".

## Before you start (founder steps)

1. **A preview branch for PR #93.** The #90 and #91 branches were deleted on 20 Nov, with the founder's yes.
   The new branch was not created from the cloud session, because creating one starts an hourly charge and the
   session's permissions stopped it. Either create it in the Supabase dashboard (Branches → Create, git branch
   `claude/cmr1-rc`), or allow the session to create it. The branch applies the RC's migrations, including
   `20261114090000_v2_capture_understanding`.
2. **The RC gateway on that branch only.** From a checkout of `claude/cmr1-rc`:
   `npx supabase functions deploy ai-gateway --project-ref <branch-ref> --use-api`. Never production's ref.
3. **The model key on that branch.** Dashboard → the branch → Edge Functions → Secrets → `ANTHROPIC_API_KEY`,
   typed by the founder.

## The run

On a Mac with Xcode, an iOS simulator, Node, and Maestro (`curl -fsSL "https://get.maestro.mobile.dev" | bash`):

1. Check out `claude/cmr1-rc` and apply the prepared files:
   `git apply docs/product/cmr1-native-staging.patch`. This adds `.maestro/cmr1-journey.yaml`,
   `e2e/make-staging-account.mjs` and the `e2e-staging` profile. Do not commit them to `main` unasked.
2. Make two throwaway accounts on the branch. The script refuses production's ref and key:
   `STAGING_API_URL=https://<branch-ref>.supabase.co STAGING_SERVICE_ROLE_KEY=<branch key> node e2e/make-staging-account.mjs`
   then the same with `--notebook`. The credentials land in a gitignored file under `e2e/.captured/`.
3. Build and install the app on the simulator against the branch:
   `EXPO_PUBLIC_SUPABASE_URL=https://<branch-ref>.supabase.co EXPO_PUBLIC_SUPABASE_ANON_KEY=<branch anon key> EXPO_PUBLIC_V2_ENTRY=1 EXPO_PUBLIC_ANALYTICS_ENABLED=false npx expo run:ios --configuration Release`
4. Run the flows in this order, each with its account:
   `maestro test .maestro/fresh-install.yaml -e E2E_EMAIL=… -e E2E_PASSWORD=…`, then
   `maestro test .maestro/cmr1-journey.yaml -e E2E_JOURNEY_EMAIL=… -e E2E_JOURNEY_PASSWORD=…`.
5. Keep the Maestro output and screenshots (`~/.maestro/tests/`) for the ledger's NATIVE-SIM column.

The journey covers onboarding, four invented people, the K36-shaped story, "Which Mateo?", Undo, a Tell naming
nobody under "Your words", a promise, relaunch, and Showing Up. Voice is not driven: a simulator has no microphone.

## The founder's iPhone voice test (about twenty minutes, a dogfood build with this RC)

- One note with a long pause in the middle, then Stop: the words appear once.
- A sentence said twice on purpose ("I love her, I love her so much"): both kept.
- Stop pressed mid-word, and Stop pressed twice: nothing doubled, nothing lost.
- A spoken story naming someone and "her husband" ("talked to nana tonight her husband is retiring"):
  Nana's husband's line. The same with someone else named first ("nana met maria at church her husband…"):
  asked, never guessed.

Afterwards: revoke the CMR-1 key, and delete the preview branch.
