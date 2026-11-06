-- The Moment Deck × Notebook × Showing Up experience (founder directive, 2 Nov 2026,
-- approving PR #77's prototype direction). One app-side flag, OFF by default and for
-- every account: the new Today, People, person notebook, Tell and review surfaces
-- render only for an account with a per-user override, set only with the founder's
-- explicit yes for that account (contract §10). No other table, rule or function
-- changes; the experience runs on the existing memory, reason and return-loop paths.
INSERT INTO public.feature_flags (key, description, server_enforced) VALUES
  ('notebook_deck', 'Moment Deck Today, People index, person notebook lenses, notebook Tell and review (PR #77 direction)', false)
ON CONFLICT (key) DO NOTHING;
