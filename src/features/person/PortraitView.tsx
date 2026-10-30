// The relationship page (Design Direction §I.7; board 2, "David Reyes"):
// their name in the display serif with their sprig, then only the sections
// that have something to say: Lately, Coming up, You said you'd, Between
// you. Every line says where it came from; tap a line to correct it, tap its
// provenance for the note. Message, Call and Tell sit at the bottom.
import React, { useRef } from "react";
import { type ScrollView, Text, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { MessageCircle, PenLine, Phone } from "lucide-react-native";
import { GUTTER, height, press, size, space } from "@/design/tokens";
import { Body, Emphasis, Label, Line, MomentText, Name, Pill, Provenance, QuietLine, Screen, Small, Sprig, useLineFocus, usePalette } from "@/ui";

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
  returnCheck?: { ask: string; about: string | null } | null;
  onReturn?: (answer: "yes" | "not_yet") => void;
  /**
   * After a Yes (founder I2, K28): "Anything worth remembering from talking with Susan?", optional and never
   * blocking, as Today asks it. Tell Kinship opens Tell about them; Nothing today changes nothing.
   */
  afterReturn?: { followUp: string } | null;
  onRemember?: () => void;
  onNothing?: () => void;
  children?: React.ReactNode;
}

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
function Section({ title, lines, ochre, leadWithWhen, onLine, onSource, focusItemId, focus, after }: {
  title: string;
  lines: PortraitLineData[];
  ochre?: boolean;
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
  return (
    <View
      onLayout={(e) => focus?.onGroup(title, e.nativeEvent.layout.y)}
      style={{ marginTop: space.x3, paddingTop: space.l, borderTopWidth: 1, borderTopColor: p.hairline }}
    >
      <Label tone={ochre ? "ochreText" : "inkBody"} accessibilityRole="header">{title}</Label>
      {lines.map((l, i) => {
        const text = withWhen(l, leadWithWhen);
        // One source line for several memories only when they came from the
        // very same note; neighbours from different notes each say their own
        // (founder H14, H19b).
        const next = i + 1 < lines.length ? lines[i + 1] : null;
        const nextShares = !!next && !next.fixed && !!l.noteId && next.noteId === l.noteId && next.provenance === l.provenance;
        return (
          <View key={l.itemId} onLayout={(e) => focus?.onLine(title, l.itemId, e.nativeEvent.layout.y)} style={{ marginTop: i === 0 ? space.m : space.s }}>
            <Emphasis on={!!focusItemId && focusItemId === l.itemId}>
            {l.fixed ? (
              <Line>{text}</Line>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text}
                accessibilityHint="Double-tap to correct it"
                onPress={() => onLine(l.itemId)}
                style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
              >
                <Line>{text}</Line>
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
              <View style={{ marginTop: space.xs }}>
                <Provenance line={l.provenance} onPress={l.noteId ? () => onSource(l.noteId as string) : undefined} />
              </View>
            )}
            </Emphasis>
          </View>
        );
      })}
      {after}
    </View>
  );
}

/** Conversations the user confirmed: history in their words, never a count or "last contacted" (founder I2). */
function Trail({ lines, first }: { lines: TrailLineData[]; first: boolean }) {
  return (
    <>
      {lines.map((t, i) => (
        <View key={t.id} accessible accessibilityLabel={t.about ? `${t.label}. ${t.about}` : t.label} style={{ marginTop: first && i === 0 ? space.m : space.s }}>
          <Line>{t.label}</Line>
          {t.about ? <Small style={{ marginTop: space.xs }}>{t.about}</Small> : null}
        </View>
      ))}
    </>
  );
}

export function PortraitView(props: PortraitViewProps) {
  const p = usePalette();
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
  const footer = (
    <View style={{ backgroundColor: p.paper }}>
    {props.kept ? <View style={{ paddingHorizontal: GUTTER }}>{props.kept}</View> : null}
    {/* Message · Call · Tell (founder native pass F1): three named actions,
        the same size. Tell adds to what Kinship knows about them; changing
        what's already kept happens on the line itself. */}
    <View style={{ flexDirection: "row", gap: space.s, paddingHorizontal: GUTTER, paddingTop: space.m, paddingBottom: space.m }}>
      <Pill
        variant="primary"
        dense
        label="Message"
        style={{ flex: 1 }}
        icon={({ color, size: s, strokeWidth }) => <MessageCircle color={color} size={s} strokeWidth={strokeWidth} />}
        onPress={props.onMessage}
      />
      <Pill
        dense
        label="Call"
        style={{ flex: 1 }}
        icon={({ color, size: s, strokeWidth }) => <Phone color={color} size={s} strokeWidth={strokeWidth} />}
        onPress={props.onCall}
      />
      <Pill
        dense
        label="Tell"
        accessibilityLabel={`Tell Kinship about ${first}`}
        accessibilityHint={props.hasDraft ? "Opens your unsent note" : undefined}
        style={{ flex: 1 }}
        icon={({ color, size: s, strokeWidth }) => <PenLine color={color} size={s} strokeWidth={strokeWidth} />}
        onPress={props.onTell}
      />
    </View>
    </View>
  );
  return (
    <Screen onBack={props.onBack} footer={footer} scrollRef={scroll}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.l }}>
        <View style={{ flex: 1, paddingTop: space.s }}>
          {props.onRename ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.name ?? ""}
              accessibilityHint="Double-tap to change their name"
              onPress={props.onRename}
              style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
            >
              <Name>{props.name}</Name>
            </Pressable>
          ) : <Name>{props.name}</Name>}
          {props.label ? <Small style={{ marginTop: space.s }}>{props.label}</Small> : null}
          {/* A visible Edit beside the name (founder I3): the name, and Remove from People. */}
          {props.onRename ? (
            <View style={{ alignItems: "flex-start", marginLeft: -space.xs }}>
              <Pill variant="quiet" size="small" label="Edit" accessibilityHint={`Change ${first}'s name, or remove them from People`} onPress={props.onRename} />
            </View>
          ) : null}
          {/* The one visual difference of a held person (D13, PER-06): one quiet line. */}
          {props.stateLine ?? (props.remembered ? "Remembered" : null) ? (
            <Small style={{ marginTop: space.xs }} accessibilityLabel={`${props.stateLine ?? "Remembered"}. ${props.stateExplain ?? ""}`.trim()}>
              {props.stateLine ?? "Remembered"}
            </Small>
          ) : null}
          {/* Someone merged into them (PER-05): said once, with Undo while it can be undone. */}
          {props.merged?.map((m) => (
            <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: space.s, marginTop: space.xs, marginLeft: -space.xs }}>
              <Small style={{ marginLeft: space.xs }}>{m.line}</Small>
              {props.onUndoMerge ? <Pill variant="quiet" size="small" label="Undo" accessibilityLabel={`Undo: ${m.line}`} onPress={() => props.onUndoMerge?.(m.id)} /> : null}
            </View>
          ))}
        </View>
        <Sprig personId={props.personId} width={size.sprig.page} remembered={props.remembered} />
      </View>

      {props.afterReturn ? (
        <View style={{ marginTop: space.xl }} accessibilityLiveRegion="polite">
          <MomentText>{props.afterReturn.followUp}</MomentText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
            <Pill size="small" variant="primary" label="Tell Kinship" onPress={() => props.onRemember?.()} />
            <Pill size="small" variant="quiet" label="Nothing today" onPress={() => props.onNothing?.()} />
          </View>
        </View>
      ) : props.returnCheck ? (
        <View style={{ marginTop: space.xl }} accessibilityLiveRegion="polite">
          <MomentText>{props.returnCheck.ask}</MomentText>
          {props.returnCheck.about ? <Small style={{ marginTop: space.xs }}>{props.returnCheck.about}</Small> : null}
          <View style={{ flexDirection: "row", gap: space.s, marginTop: space.m }}>
            <Pill size="small" label="Yes" onPress={() => props.onReturn?.("yes")} />
            <Pill size="small" label="Not yet" onPress={() => props.onReturn?.("not_yet")} />
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
                <Pill size="small" label="Yes" onPress={() => props.onLink?.(l.key, true)} />
                <Pill size="small" variant="quiet" label="No, someone else" onPress={() => props.onLink?.(l.key, false)} />
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


      <Section title="Lately" lines={props.lately} onLine={props.onLine} onSource={props.onSource} focusItemId={props.focusItemId} focus={focus} />
      <Section title="Coming up" lines={props.comingUp} leadWithWhen onLine={props.onLine} onSource={props.onSource} focusItemId={props.focusItemId} focus={focus} />
      <Section title="You said you'd" lines={props.youSaid} ochre onLine={props.onLine} onSource={props.onSource} focusItemId={props.focusItemId} focus={focus} />
      <Section
        title="Between you"
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
            marginTop: space.x3, paddingTop: space.m, borderTopWidth: 1, borderTopColor: p.hairline, opacity: pressed ? press.link : 1,
            minHeight: height.small, justifyContent: "center",
          })}
        >
          <Small tone="ochreText">{`What Kinship knows about ${first} →`}</Small>
        </Pressable>
      ) : null}
      {props.children}
    </Screen>
  );
}
