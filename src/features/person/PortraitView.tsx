// The relationship page (Electric Garden, FD-30b; recomposed after the founder's review of PR #71 as a
// portrait and a continuing story rather than a name over four identical sections):
//
//   the hero        the lavender bloom from the page's top left; their photo in the fluid mask with a
//                   leaf crossing it, or the leaf alone; their name at poster scale; Edit · Add a photo
//   what's next     Coming up as a dated ledger: the day in caps down a column, the line beside it, a
//                   lime rule (the same vocabulary as Today's week, so the two pages read as one)
//   the story       Lately as running serif lines, each with its source
//   your word       You said you'd in the user's own serif italic behind a sunset rule: the user's
//                   intentions, set apart from what they know
//   between you     shared lines, then the conversations as a dated ledger behind a lavender rule
//   ways to connect Message · Call · Tell pinned below; "What Kinship knows about Ben →" closes the page
//
// Every stored memory stays findable (What Kinship knows), correctable (tap a line) and inspectable
// (tap its source). Nothing counts, ranks or scores; a held person differs by one line.
import React, { useRef } from "react";
import { type ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { MessageCircle, PenLine, Phone } from "lucide-react-native";
import { art, font, GUTTER, height, press, space, TOUCH } from "@/design/tokens";
import {
  Body, Botanical, DawnWash, Emphasis, FluidPhoto, isLargeText, Label, Line, MomentText, Pill, PosterName, Provenance, QuietLine, Quote, Screen,
  SectionLabel, type SectionKey, Small, useLineFocus, usePalette, Week,
} from "@/ui";

export interface PortraitLineData {
  itemId: string;
  statement: string;
  when: string | null;
  provenance: string;
  noteId: string | null;
  /** From the person's record (a contact's birthday): shown, not corrected here. */
  fixed?: boolean;
  /** What it replaced: "was: Susan is moving to Oakland in August" (H23). */
  was?: string | null;
}

/** "Remove from People" (founder I3): a soft archive; the confirm says what stays and where they come back from. */
export const REMOVE_COPY = { action: "Remove from People", cancel: "Cancel", remove: "Remove" } as const;

export function removeCopy(name: string): { title: string; body: string; cancel: string; remove: string } {
  return {
    title: `Remove ${name} from People?`,
    body: `${name} won't appear in People or Today. Your notes stay, and you can bring ${name} back from Settings.`,
    cancel: REMOVE_COPY.cancel,
    remove: REMOVE_COPY.remove,
  };
}

/** One conversation the user confirmed (founder I2): "You messaged · Oct 12", and what it was about. */
export interface TrailLineData {
  id: string;
  label: string;
  about: string | null;
}

/** Manual entry for what Kinship can't know (founder I2): one tap to open, one to say how. */
export const IN_TOUCH = {
  action: "Add a conversation",
  title: (name: string) => `How were you in touch with ${name}?`,
  choices: [
    { channel: "text", label: "Message" },
    { channel: "call", label: "Call" },
    { channel: "video", label: "Video" },
    { channel: "in_person", label: "In person" },
  ],
} as const;

export interface PortraitViewProps {
  personId: string;
  name: string | null;
  /** Still being read: an empty screen, never "isn't here any more". */
  loading?: boolean;
  /** The name Kinship says (names.ts shortName): "Michelle" from Contacts, a chosen "Cutie Pie" whole (founder I12). */
  short?: string | null;
  label: string | null;
  remembered: boolean;
  /** "Paused" / "Remembered" (D13): the only visual difference of a held person; null for anyone active. */
  stateLine?: string | null;
  /** What the line means, read to screen readers with it. */
  stateExplain?: string | null;
  /** People merged into them that can still be undone (PER-05), each as one quiet line. */
  merged?: { id: string; line: string }[];
  onUndoMerge?: (mergeId: string) => void;
  /** Tapping the name corrects it (H1). */
  onRename?: () => void;
  lately: PortraitLineData[];
  comingUp: PortraitLineData[];
  youSaid: PortraitLineData[];
  between: PortraitLineData[];
  /** The newest conversations the user confirmed, under Between you (founder I2). */
  trail?: TrailLineData[];
  /** "Add a conversation": a conversation Kinship couldn't know about (only for someone active). */
  onInTouch?: () => void;
  total: number;
  onBack: () => void;
  onLine: (itemId: string) => void;
  onSource: (noteId: string) => void;
  onKnows: () => void;
  onMessage: () => void;
  onCall: () => void;
  onTell: () => void;
  /** What happened to a note just told about them (the Kept card). */
  kept?: React.ReactNode;
  /**
   * Notes about them still open (stabilization Gate A): a question waiting on
   * the user, or a note still being understood. Quiet lines, never a badge.
   */
  waiting?: { captureId: string; label: string; text: string; action: string | null }[];
  onWaiting?: (captureId: string) => void;
  /** Someone added after they were mentioned: "Is this the Michelle in …?" (Yes / No). */
  links?: { key: string; prompt: string }[];
  onLink?: (key: string, yes: boolean) => void;
  /** An unsent note about them is waiting (Tell reopens it). */
  hasDraft?: boolean;
  /** "View Ben" from a Moment (founder I1): the page lands on this line, which comes up quietly. */
  focusItemId?: string | null;
  /**
   * Back from a conversation Kinship opened with them, from here or from Today (founder K23): the same
   * return question Today asks, "Did you reach John?", with what it was about.
   */
  returnCheck?: { ask: string; about: string | null; type?: string } | null;
  /** "put_aside" is "Didn't happen", offered only on a promise's return check (RSN-06, WS-3). */
  onReturn?: (answer: "yes" | "not_yet" | "put_aside") => void;
  /** After a Yes that followed a "You could…" tap (SUA-1, FD-30d; WS-3): one optional question, Yes · Not yet. */
  afterGesture?: { ask: string } | null;
  onGesture?: (answer: "yes" | "not_yet") => void;
  /**
   * After a Yes (founder I2, K28): "Anything worth remembering from talking with Susan?", optional and never
   * blocking, as Today asks it. Tell Kinship opens Tell about them; Nothing today changes nothing.
   */
  afterReturn?: { followUp: string } | null;
  onRemember?: () => void;
  onNothing?: () => void;
  /** The photo the user chose for them (kept on this phone only); null when there is none. */
  photoUri?: string | null;
  /** "Add a photo" / "Change photo": the user's own choice, from their library. */
  onPhoto?: () => void;
  children?: React.ReactNode;
}

/** The photo action's words. */
export const PHOTO_ACTION = { add: "Add a photo", change: "Change photo" } as const;

function withWhen(l: PortraitLineData, leading = false): string {
  if (!l.when || l.when === "No date yet") return l.statement;
  const plain = l.when.replace(/[“”]/gu, "");
  if (l.statement.toLocaleLowerCase().includes(plain.toLocaleLowerCase())) return l.statement;
  // Coming up leads with when it is (stabilization Gate H).
  return leading ? `${l.when} · ${l.statement}` : `${l.statement} · ${l.when}`;
}

/**
 * Sections read as groups (Gate H, within the approved look): more space
 * between sections than between lines, a hairline above each label, labels a
 * step darker. "You told Kinship · Oct 5" is shown once per run of lines that
 * share it, not under every line (the line's sheet always has it).
 */
type SectionVariant = "ledger" | "story" | "intent" | "between";

function Section({ title, section, variant, lines, leadWithWhen, onLine, onSource, focusItemId, focus, after }: {
  title: string;
  section: SectionKey;
  /** How the section is composed: a dated ledger, running story lines, the user's own intentions, or shared lines. */
  variant: SectionVariant;
  lines: PortraitLineData[];
  leadWithWhen?: boolean;
  onLine: (id: string) => void;
  onSource: (noteId: string) => void;
  focusItemId?: string | null;
  focus?: ReturnType<typeof useLineFocus>;
  /** More of the section after its lines (Between you's conversations, founder I2). */
  after?: React.ReactNode;
}) {
  const p = usePalette();
  if (!lines.length && !after) return null;
  const rule = variant === "ledger" ? p.mark : variant === "intent" ? p.sunset : variant === "between" ? p.lavender : null;
  const Words = variant === "intent" ? Quote : Line;
  return (
    <View onLayout={(e) => focus?.onGroup(title, e.nativeEvent.layout.y)} style={{ marginTop: space.x3 }}>
      <SectionLabel section={section}>{title}</SectionLabel>
      <View style={rule ? { marginTop: space.xs, borderLeftWidth: 2, borderLeftColor: rule, paddingLeft: space.l } : undefined}>
      {lines.map((l, i) => {
        // A dated ledger says the day in its own column; the other sections say it with the line.
        const dated = variant === "ledger" && !!l.when && l.when !== "No date yet";
        const text = dated ? l.statement : withWhen(l, leadWithWhen);
        // One source line for several memories only when they came from the
        // very same note; neighbours from different notes each say their own
        // (founder H14, H19b).
        const next = i + 1 < lines.length ? lines[i + 1] : null;
        const nextShares = !!next && !next.fixed && !!l.noteId && next.noteId === l.noteId && next.provenance === l.provenance;
        return (
          <View key={l.itemId} onLayout={(e) => focus?.onLine(title, l.itemId, e.nativeEvent.layout.y)} style={{ marginTop: i === 0 ? space.m : space.l }}>
            <Emphasis on={!!focusItemId && focusItemId === l.itemId}>
            {dated ? <Week style={{ marginBottom: space.xs }}>{l.when}</Week> : null}
            {l.fixed ? (
              <Words>{text}</Words>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={dated ? `${l.when} · ${text}` : text}
                accessibilityHint="Double-tap to correct it"
                onPress={() => onLine(l.itemId)}
                style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
              >
                <Words>{text}</Words>
              </Pressable>
            )}
            {l.was ? (
              <Small style={{ marginTop: space.xs }} accessibilityLabel={`Was: ${l.was}`}>
                {"was: "}
                <Text style={{ textDecorationLine: "line-through" }}>{l.was}</Text>
              </Small>
            ) : null}
            {/* Said once for the lines it covers: under the last of them. */}
            {nextShares ? null : (
              <View style={{ marginTop: space.s }}>
                <Provenance line={l.provenance} onPress={l.noteId ? () => onSource(l.noteId as string) : undefined} />
              </View>
            )}
            </Emphasis>
          </View>
        );
      })}
      {after}
      </View>
    </View>
  );
}

/** Conversations the user confirmed: history in their words, never a count or "last contacted" (founder I2). */
function Trail({ lines, first }: { lines: TrailLineData[]; first: boolean }) {
  return (
    <>
      {lines.map((t, i) => (
        <View key={t.id} accessible accessibilityLabel={t.about ? `${t.label}. ${t.about}` : t.label} style={{ marginTop: first && i === 0 ? space.m : space.l }}>
          <Line>{t.label}</Line>
          {t.about ? <Small style={{ marginTop: space.xs }}>{t.about}</Small> : null}
        </View>
      ))}
    </>
  );
}

export function PortraitView(props: PortraitViewProps) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const focus = useLineFocus(props.focusItemId, scroll);
  if (!props.name) {
    return (
      <Screen onBack={props.onBack}>
        {props.loading ? null : <Body>{"This person isn't here any more."}</Body>}
      </Screen>
    );
  }
  const first = props.short?.trim() || props.name.trim().split(/\s+/u)[0];
  // Nothing told about them yet (a birthday from Contacts doesn't count).
  const empty = !props.lately.length && !props.comingUp.some((l) => !l.fixed) && !props.youSaid.length && !props.between.length;
  // At accessibility text sizes the three actions stack; stacked pills stretch (flex: 1 in a column with no
  // set height collapses them onto each other, seen on the 17e at the largest size).
  const stacked = isLargeText();
  const grow = stacked ? { alignSelf: "stretch" as const } : { flex: 1 };
  const footer = (
    <View style={{ backgroundColor: p.paper }}>
    {props.kept ? <View style={{ paddingHorizontal: GUTTER }}>{props.kept}</View> : null}
    {/* Message · Call · Tell (founder native pass F1): three named actions,
        the same size. Tell adds to what Kinship knows about them; changing
        what's already kept happens on the line itself. */}
    <View style={{ flexDirection: stacked ? "column" : "row", gap: space.s, paddingHorizontal: GUTTER, paddingTop: space.m, paddingBottom: space.m }}>
      <Pill
        variant="primary"
        dense
        label="Message"
        style={grow}
        icon={({ color, size: s, strokeWidth }) => <MessageCircle color={color} size={s} strokeWidth={strokeWidth} />}
        onPress={props.onMessage}
      />
      <Pill
        dense
        label="Call"
        style={grow}
        icon={({ color, size: s, strokeWidth }) => <Phone color={color} size={s} strokeWidth={strokeWidth} />}
        onPress={props.onCall}
      />
      <Pill
        dense
        label="Tell"
        accessibilityLabel={`Tell Kinship about ${first}`}
        accessibilityHint={props.hasDraft ? "Opens your unsent note" : undefined}
        style={grow}
        icon={({ color, size: s, strokeWidth }) => <PenLine color={color} size={s} strokeWidth={strokeWidth} />}
        onPress={props.onTell}
      />
    </View>
    </View>
  );
  // The hero (Stage 1): the lavender bloom from the top left; the photo, in the fluid mask, to the right
  // with a leaf in front; without a photo, a leaf behind where the photo would be. The photo starts under
  // the back control, so the page opens on the person.
  const k = width / 393;
  const photo = props.photoUri ?? null;
  const photoW = Math.round(width * 0.585);
  const photoH = Math.round(photoW * art.photo.aspect);
  const pageArt = (
    <>
      <DawnWash kind="warm" height={420} />
      <Botanical art="lavender" width={photo ? 262 : 300} top={-10} left={-30} />
      {photo ? null : <Botanical art="leaf" width={150} top={120} left={214} rotate={28} flip />}
    </>
  );
  return (
    <Screen onBack={props.onBack} footer={footer} scrollRef={scroll} art={pageArt}>
      {photo ? (
        <View style={{ height: photoH - 40 * k, marginTop: -TOUCH, alignItems: "flex-end", marginRight: -GUTTER / 2 }}>
          <FluidPhoto uri={photo} width={photoW} height={photoH} label={`Photo of ${first}`} />
          <Botanical art="leaf" width={128} top={134} left={58} rotate={-34} />
        </View>
      ) : (
        <View style={{ height: 196 * k }} />
      )}
      <PosterName
        name={props.name}
        max={104}
        onPress={props.onRename}
        accessibilityLabel={props.name ?? ""}
        accessibilityHint={props.onRename ? "Double-tap to change their name" : undefined}
      />
      {props.label ? <Small style={{ marginTop: space.s }}>{props.label}</Small> : null}
      {/* Someone merged into them (PER-05): said once, with Undo while it can be undone. */}
      {props.merged?.map((m) => (
        <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: space.s, marginTop: space.xs, marginLeft: -space.xs }}>
          <Small style={{ marginLeft: space.xs }}>{m.line}</Small>
          {props.onUndoMerge ? <Pill variant="quiet" size="small" label="Undo" accessibilityLabel={`Undo: ${m.line}`} onPress={() => props.onUndoMerge?.(m.id)} /> : null}
        </View>
      ))}
      {/* A visible Edit beside the name (founder I3): the name, and Remove from People; and the user's own photo (FD-30b). */}
      {props.onRename || props.onPhoto ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginLeft: -space.xs }}>
          {props.onRename ? (
            <Pill variant="quiet" size="small" label="Edit" accessibilityHint={`Change ${first}'s name, or remove them from People`} onPress={props.onRename} />
          ) : null}
          {props.onPhoto ? (
            <Pill
              variant="quiet"
              size="small"
              label={photo ? PHOTO_ACTION.change : PHOTO_ACTION.add}
              accessibilityHint={`A photo of ${first} from your library. It stays on this phone`}
              onPress={props.onPhoto}
            />
          ) : null}
        </View>
      ) : null}

      {/* The one visual difference of a held person (D13, PER-06): one line, on clear paper below the actions
          (it sat over the leaf art under the name and could not be read). */}
      {(props.stateLine ?? (props.remembered ? "Remembered" : null)) ? (
        <Body
          tone="ink"
          style={{ marginTop: space.s, fontFamily: font.sansSemi }}
          accessibilityLabel={`${props.stateLine ?? "Remembered"}. ${props.stateExplain ?? ""}`.trim()}
        >
          {props.stateLine ?? "Remembered"}
        </Body>
      ) : null}

      {props.afterGesture ? (
        <View style={{ marginTop: space.xl }} accessibilityLiveRegion="polite">
          <MomentText>{props.afterGesture.ask}</MomentText>
          <View style={{ flexDirection: "row", gap: space.s, marginTop: space.m }}>
            <Pill size="small" fixedLabel label="Yes" onPress={() => props.onGesture?.("yes")} />
            <Pill size="small" fixedLabel label="Not yet" onPress={() => props.onGesture?.("not_yet")} />
          </View>
        </View>
      ) : props.afterReturn ? (
        <View style={{ marginTop: space.xl }} accessibilityLiveRegion="polite">
          <MomentText>{props.afterReturn.followUp}</MomentText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
            <Pill size="small" variant="primary" fixedLabel label="Tell Kinship" onPress={() => props.onRemember?.()} />
            <Pill size="small" variant="quiet" fixedLabel label="Nothing today" onPress={() => props.onNothing?.()} />
          </View>
        </View>
      ) : props.returnCheck ? (
        <View style={{ marginTop: space.xl }} accessibilityLiveRegion="polite">
          <MomentText>{props.returnCheck.ask}</MomentText>
          {props.returnCheck.about ? <Small style={{ marginTop: space.xs }}>{props.returnCheck.about}</Small> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
            <Pill size="small" fixedLabel label="Yes" onPress={() => props.onReturn?.("yes")} />
            <Pill size="small" fixedLabel label="Not yet" onPress={() => props.onReturn?.("not_yet")} />
            {props.returnCheck.type === "promise" ? <Pill size="small" variant="quiet" label="Didn't happen" onPress={() => props.onReturn?.("put_aside")} /> : null}
          </View>
        </View>
      ) : null}

      {props.links?.length ? (
        <View style={{ marginTop: space.xl, gap: space.m }}>
          {props.links.map((l) => (
            <View key={l.key} accessibilityLabel={l.prompt}>
              <Label>{"One thing to check"}</Label>
              <Body tone="ink" style={{ marginTop: space.xs }}>{l.prompt}</Body>
              <View style={{ flexDirection: "row", gap: space.s, marginTop: space.s }}>
                <Pill size="small" fixedLabel label="Yes" onPress={() => props.onLink?.(l.key, true)} />
                <Pill size="small" variant="quiet" fixedLabel label="No, someone else" onPress={() => props.onLink?.(l.key, false)} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {props.waiting?.length ? (
        <View style={{ marginTop: space.xl, gap: space.m }}>
          {props.waiting.map((w) => (
            <QuietLine
              key={w.captureId}
              label={w.label}
              text={w.text}
              action={w.action ? { label: w.action, onPress: () => props.onWaiting?.(w.captureId) } : undefined}
              onPress={w.action ? () => props.onWaiting?.(w.captureId) : undefined}
            />
          ))}
        </View>
      ) : null}


      {/* What's next first (Stage 1's order), then the story, the user's own word, and what's between you. */}
      <Section title="Coming up" section="comingUp" variant="ledger" lines={props.comingUp} leadWithWhen onLine={props.onLine} onSource={props.onSource} focusItemId={props.focusItemId} focus={focus} />
      <Section title="Lately" section="lately" variant="story" lines={props.lately} onLine={props.onLine} onSource={props.onSource} focusItemId={props.focusItemId} focus={focus} />
      <Section title="You said you'd" section="youSaid" variant="intent" lines={props.youSaid} onLine={props.onLine} onSource={props.onSource} focusItemId={props.focusItemId} focus={focus} />
      <Section
        title="Between you"
        section="between"
        variant="between"
        lines={props.between}
        onLine={props.onLine}
        onSource={props.onSource}
        focusItemId={props.focusItemId}
        focus={focus}
        after={props.trail?.length ? <Trail lines={props.trail} first={!props.between.length} /> : null}
      />
      {/* What Kinship can't know (founder I2): never on a page with nothing told yet. */}
      {props.onInTouch && !empty ? (
        <View style={{ alignItems: "flex-start", marginTop: space.m, marginLeft: -space.xs }}>
          <Pill variant="quiet" size="small" label={IN_TOUCH.action} accessibilityHint={IN_TOUCH.title(first)} onPress={props.onInTouch} />
        </View>
      ) : null}
      {empty ? (
        <View style={{ marginTop: space.xl, alignItems: "flex-start" }}>
          <Body>{`What you tell Kinship about ${first} will be here: what's going on with them, what's coming up, what you said you'd do.`}</Body>
          <View style={{ marginTop: space.l }}>
            <Pill label={`Tell Kinship about ${first}`} onPress={props.onTell} />
          </View>
        </View>
      ) : null}

      {props.total > 0 || props.trail?.length ? (
        <Pressable
          accessibilityRole="link"
          onPress={props.onKnows}
          style={({ pressed }) => ({
            marginTop: space.x3, opacity: pressed ? press.link : 1,
            minHeight: height.small, justifyContent: "center",
          })}
        >
          <Body tone="ink" style={{ fontFamily: font.sansSemi }}>{`What Kinship knows about ${first} →`}</Body>
        </Pressable>
      ) : null}
      {props.children}
    </Screen>
  );
}
