/**
 * Analytics without surveillance (OBS-06, plan §23)
 *
 * `track(event, props)` accepts only the events in AnalyticsEvents, and
 * every prop is a closed union, a boolean or a bounded bucket. There is no
 * way to pass a name, a note, a message or any other free text without
 * changing this schema, which is reviewed for privacy. The same schema is
 * meant for the server-side sink (OBS-07).
 *
 * Nothing is sent yet: the provider (PostHog with IP capture, autocapture
 * and replay off, or a first-party Supabase table) is a founder decision.
 * Until a sink is installed with setAnalyticsSink, events go nowhere.
 */

export type CaptureSource =
  | "text"
  | "voice"
  | "share"
  | "screenshot"
  | "siri"
  | "widget"
  | "post_handoff"
  | "post_encounter"
  | "photo"
  | "onboarding";
export type CharsBucket = "0-50" | "51-200" | "201+";
export type LatencyBucket = "<1s" | "1-3s" | "3-10s" | "10s+";
/** Finer duration buckets for performance telemetry (p50/p90 without exact values). */
export type DurationBucket =
  | "<0.5s"
  | "0.5-1s"
  | "1-2s"
  | "2-3s"
  | "3-5s"
  | "5-8s"
  | "8-13s"
  | "13-20s"
  | "20-60s"
  | "1-10m"
  | "10m+";
/** Where a Tell attempt failed: no answer (offline / timed out), the server refused or erred, the daily limit. */
export type TellFailureStage = "offline" | "timeout" | "server" | "limited" | "gave_up";
export type ScoreBucket = "low" | "mid" | "high";
export type MinutesBucket = "<15" | "15-60" | "1-6h" | "6h+";
export type ExtractionTier = "auto" | "light" | "clarify" | "none";
/** The 2.0 memory kinds (plan §5). */
export type MemoryKindName =
  | "fact"
  | "event"
  | "promise"
  | "plan"
  | "thread"
  | "moment"
  | "milestone"
  | "tradition"
  | "context";
/**
 * How a saved item reached the user: saved quietly ("auto") or shown to look
 * over ("light"); "later" is outside any review (e.g. a person's page).
 */
export type ReviewTier = "auto" | "light" | "later";
/** What a held question was about. Coarse, never its words. */
export type ClarificationType = "person" | "relation" | "new_person" | "date" | "keep";
export type ReasonType =
  | "birthday"
  | "upcoming"
  | "follow_up"
  | "promise"
  | "anniversary"
  | "check_in"
  | "season"
  | "other";
export type Channel = "text" | "call" | "facetime" | "whatsapp" | "email" | "in_person" | "other";
export type PushTier = "quiet" | "normal" | "important";
export type SettingKey =
  | "ai_consent"
  | "notifications"
  | "garden_walk"
  | "calendar_matching"
  | "quiet_hours"
  | "appearance";
export type ConsentScope = "ai_processing" | "analytics" | "notifications";
/** Small counts only; anything larger is reported as 10. */
export type SmallCount = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface AnalyticsEvents {
  capture_started: { source: CaptureSource };
  capture_completed: { source: CaptureSource; chars_bucket: CharsBucket; offline: boolean };
  extraction_completed: {
    items_n: SmallCount;
    tier: ExtractionTier;
    latency_ms_bucket: LatencyBucket;
    model_id: "primary" | "fallback";
  };
  extraction_corrected: {
    correction: "person" | "date" | "kind" | "owner" | "relation" | "statement";
    item_kind: MemoryKindName;
  };
  clarification_shown: { type: ClarificationType };
  clarification_answered: { type: ClarificationType };
  clarification_dismissed: { type: ClarificationType };
  review_item_shown: { tier: Exclude<ReviewTier, "later">; item_kind: MemoryKindName };
  review_item_accepted: { tier: Exclude<ReviewTier, "later">; item_kind: MemoryKindName };
  review_item_rejected: { tier: ReviewTier; item_kind: MemoryKindName };
  review_left: { how: "done" | "idle" | "dismissed"; question_waiting: boolean };
  review_reopened: { question_waiting: boolean };
  /**
   * A Tell's lifecycle, timed (stabilization Gate A): sent → understood
   * (server and model) and understood → shown (the phone presenting it), so
   * a slow model and a slow screen can be told apart. Buckets only.
   */
  tell_lifecycle: {
    outcome: "kept" | "needs_input" | "nothing" | "failed";
    understood_bucket: LatencyBucket;
    shown_bucket: LatencyBucket;
    /** Send → the result visible: what the user waited, end to end. */
    total_bucket: DurationBucket;
    /** Send → the gateway request started (local save, note upload, queue). */
    sync_bucket: DurationBucket | "unknown";
    /** The last request's round trip (network + server + applying the reply). */
    gateway_bucket: DurationBucket | "unknown";
    /** Time spent in ai-gateway itself (its Server-Timing header). */
    server_bucket: DurationBucket | "unknown";
    /** The round trip minus the server: network and the phone's handling. */
    network_bucket: DurationBucket | "unknown";
    /** Reading → on screen: the phone presenting it. */
    render_bucket: DurationBucket;
    /** Failed attempts before this result (retries). */
    retries: SmallCount;
    /**
     * Send tapped → "Understanding…" on screen (CC-18): how soon the user saw
     * it was taken. "not_shown" when the result came first; "unknown" when
     * this launch didn't see the Send (another device, a relaunch).
     */
    understanding_bucket: DurationBucket | "not_shown" | "unknown";
    /** The app went to the background while it was being understood (CC-18). */
    backgrounded: boolean | "unknown";
  };
  /** One failed attempt to understand a Tell: the stage only, never the note. */
  tell_failure: { stage: TellFailureStage; attempt: SmallCount; backgrounded: boolean | "unknown" };
  /** The app's JavaScript thread stopped responding while in the foreground (freeze investigation). */
  app_stall: { duration_bucket: DurationBucket; tell_work: boolean };
  /** "Got it right / Not quite" on a Kept card (H6): the verdict and its fixed reason, never content. */
  tell_feedback: {
    verdict: "right" | "not_quite";
    off: "wrong_person" | "missed_something" | "wrong_relationship" | "wrong_wording" | "other" | "none";
  };
  capture_abandoned: { chars_bucket: CharsBucket };
  undo_capture: Record<string, never>;
  reason_surfaced: { reason_type: ReasonType; surface: "today" | "push" | "brief"; score_bucket: ScoreBucket };
  reason_dismissed: { reason_type: ReasonType; mode: "not_now" | "not_helpful" };
  handoff_opened: { reason_type?: ReasonType; channel: Channel };
  return_check_answered: { answer: "yes" | "not_yet"; minutes_since_handoff_bucket: MinutesBucket };
  reason_marked_done: { reason_type: ReasonType };
  reason_feedback: { useful: "yes" | "no" };
  incorrect_report: { what: "person" | "fact" | "date" };
  brief_viewed: { lines_n: SmallCount };
  push_sent: { tier: PushTier };
  push_opened: { tier: PushTier };
  settings_changed: { key: SettingKey };
  deletion_completed: { scope: "item" | "capture" | "person" | "account" };
  consent_changed: { scope: ConsentScope; granted: boolean };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

export interface AnalyticsSink {
  send(event: AnalyticsEventName, props: Record<string, string | number | boolean>): void;
}

const noopSink: AnalyticsSink = { send: () => {} };
let sink: AnalyticsSink = noopSink;

/** Installs the provider once it's chosen; pass nothing to stop sending. */
export function setAnalyticsSink(next?: AnalyticsSink): void {
  sink = next ?? noopSink;
}

export function track<E extends AnalyticsEventName>(
  event: E,
  ...[props]: AnalyticsEvents[E] extends Record<string, never> ? [] : [AnalyticsEvents[E]]
): void {
  try {
    sink.send(event, { ...(props ?? {}) } as Record<string, string | number | boolean>);
  } catch {
    // Analytics never breaks the app.
  }
}

/** Buckets a character count without sending the count itself. */
export function charsBucket(n: number): CharsBucket {
  return n <= 50 ? "0-50" : n <= 200 ? "51-200" : "201+";
}

/** A duration as a latency bucket. */
export function latencyBucketOf(ms: number): LatencyBucket {
  return ms < 1000 ? "<1s" : ms < 3000 ? "1-3s" : ms < 10_000 ? "3-10s" : "10s+";
}

/** A duration as a fine performance bucket. */
export function durationBucketOf(ms: number): DurationBucket {
  if (ms < 500) return "<0.5s";
  if (ms < 1000) return "0.5-1s";
  if (ms < 2000) return "1-2s";
  if (ms < 3000) return "2-3s";
  if (ms < 5000) return "3-5s";
  if (ms < 8000) return "5-8s";
  if (ms < 13_000) return "8-13s";
  if (ms < 20_000) return "13-20s";
  if (ms < 60_000) return "20-60s";
  return ms < 600_000 ? "1-10m" : "10m+";
}

/**
 * The events performance-only telemetry may send (dogfood-v2): latency,
 * lifecycle failures, retries and stalls. Nothing about what the user does
 * with their memories, and never the "Got it right / Not quite" feedback.
 */
export const PERFORMANCE_EVENTS: readonly AnalyticsEventName[] = ["tell_lifecycle", "tell_failure", "app_stall"];

/** Clamps a count into SmallCount. */
export function smallCount(n: number): SmallCount {
  return Math.max(0, Math.min(10, Math.floor(n))) as SmallCount;
}

/** A reason's score as low (< 55), mid (55–80) or high. */
export function scoreBucket(score: number): ScoreBucket {
  return score < 55 ? "low" : score <= 80 ? "mid" : "high";
}

/** Time from a hand-off to the return check's answer. */
export function minutesBucket(ms: number): MinutesBucket {
  const m = ms / 60_000;
  return m < 15 ? "<15" : m < 60 ? "15-60" : m < 360 ? "1-6h" : "6h+";
}

/** The analytics name for a Today reason type. */
export function reasonTypeName(type: "upcoming_event" | "event_followup" | "birthday" | "good_news" | "starts_today"): ReasonType {
  if (type === "birthday") return "birthday";
  if (type === "good_news") return "other";
  if (type === "starts_today") return "upcoming";
  return type === "event_followup" ? "follow_up" : "upcoming";
}
