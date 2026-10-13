-- Kinship 2.0, Phase 4A step 5: the interaction trail (founder I2, CC-19,
-- CC-20) and "Not yet" bringing a Moment back after a sync (N6). The design
-- is phase4-implementation-brief.md §1 (4A), approved on 8 Oct (CC-20).
--
-- Additive only: two nullable columns, two widened CHECKs, an index and one
-- replaced trigger function. No stored row changes.
--
--   * contact_events.memory_item_id: what a confirmed conversation was about
--     ("You messaged · Oct 12 · About the contractor number"). Set null if
--     that memory is ever hard-deleted; the contact itself stays.
--   * contact_events.moment_type: content-free, which kind of Moment led to
--     it. A Moment worked out on the phone (a birthday, good news, a
--     milestone, a Coming up or "Waiting on" line) has no server reason, so
--     its "Yes" is now a return check too (it used to be recorded as
--     manual). 'coming_up' and 'waiting' are the two I1 surfaces beyond the
--     brief's list (founder I1: a Coming up or Waiting line hands off too).
--   * channel 'video': a manual "Video" isn't necessarily FaceTime.
--   * reason_events_apply: "Not yet" puts an acted reason back to surfaced
--     while its window is open (N6). Done, dismissed, expired and suppressed
--     never reopen; a window that has closed stays closed.

ALTER TABLE public.contact_events ADD COLUMN memory_item_id uuid;
ALTER TABLE public.contact_events
  ADD CONSTRAINT contact_events_memory_item_fkey FOREIGN KEY (memory_item_id, user_id)
  REFERENCES public.memory_items (id, user_id) ON DELETE SET NULL (memory_item_id);
CREATE INDEX contact_events_memory_item_idx ON public.contact_events (memory_item_id) WHERE memory_item_id IS NOT NULL;

ALTER TABLE public.contact_events ADD COLUMN moment_type text
  CONSTRAINT contact_events_moment_type_check CHECK (moment_type IS NULL OR moment_type IN (
    'birthday', 'good_news', 'starts_today', 'milestone', 'upcoming_event', 'event_followup', 'coming_up', 'waiting'));

ALTER TABLE public.contact_events DROP CONSTRAINT contact_events_channel_check;
ALTER TABLE public.contact_events ADD CONSTRAINT contact_events_channel_check
  CHECK (channel IN ('text', 'call', 'facetime', 'whatsapp', 'email', 'in_person', 'video', 'other'));

-- A return check names what it answered: a server reason, or a Moment made on the phone.
ALTER TABLE public.contact_events DROP CONSTRAINT contact_events_check;
ALTER TABLE public.contact_events ADD CONSTRAINT contact_events_check
  CHECK (source <> 'return_check' OR reason_id IS NOT NULL OR moment_type IS NOT NULL);

CREATE OR REPLACE FUNCTION public.reason_events_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_state text;
BEGIN
  NEW.created_at := clock_timestamp();
  next_state := CASE NEW.event
    WHEN 'shown' THEN 'surfaced'
    WHEN 'acted' THEN 'acted'
    WHEN 'done' THEN 'done'
    WHEN 'return_yes' THEN 'done'
    WHEN 'dismissed_not_now' THEN 'dismissed'
    WHEN 'dismissed_not_helpful' THEN 'dismissed'
    ELSE NULL
  END;
  IF next_state IS NOT NULL THEN
    UPDATE public.reasons SET state = next_state
     WHERE id = NEW.reason_id AND user_id = NEW.user_id
       AND state NOT IN ('done', 'expired', 'suppressed')
       AND NOT (next_state = 'surfaced' AND state IN ('acted', 'dismissed'));
  END IF;
  -- N6: "Not yet" lets the reason speak again while its window lasts. Only an
  -- acted reason; never one done, put aside, expired or suppressed.
  IF NEW.event = 'return_not_yet' THEN
    UPDATE public.reasons SET state = 'surfaced'
     WHERE id = NEW.reason_id AND user_id = NEW.user_id
       AND state = 'acted' AND window_end > clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reason_events_apply() FROM PUBLIC, anon, authenticated;
