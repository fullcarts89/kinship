-- Kinship 2.0 — showing up (FD-30e; CC-25 "Commit next": RSN-06 promise reasons, RSN-07 open-thread reasons).
--
-- A conversation the user confirmed from a promise's Moment ("Did you bring Sam soup?" → Yes) or an open
-- thread's check-in ("Did you ask Felix about it?" → Yes) names the kind of Moment that led to it, as every
-- Moment made on the phone does (20261013090000). Two more values in the closed, content-free set; nothing
-- else changes. Additive and forward-only: existing rows satisfy the new check.

ALTER TABLE public.contact_events DROP CONSTRAINT contact_events_moment_type_check;
ALTER TABLE public.contact_events ADD CONSTRAINT contact_events_moment_type_check CHECK (moment_type IS NULL OR moment_type IN (
  'birthday', 'good_news', 'starts_today', 'milestone', 'upcoming_event', 'event_followup', 'coming_up', 'waiting',
  'promise', 'thread'));

COMMENT ON CONSTRAINT contact_events_moment_type_check ON public.contact_events IS
  'Which kind of Moment led to a confirmed conversation (content-free); promise and thread since FD-30e.';
