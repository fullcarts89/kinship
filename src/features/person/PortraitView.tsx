// The relationship page (Design Direction §I.7; board 2, "David Reyes"):
// their name in the display serif with their sprig, then only the sections
// that have something to say: Lately, Coming up, You said you'd, Between
// you. Every line says where it came from; tap a line to correct it, tap its
// provenance for the note. Message, Call and Tell sit at the bottom.
import React from "react";
import { Text, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { MessageCircle, PenLine, Phone } from "lucide-react-native";
import { GUTTER, height, press, size, space } from "@/design/tokens";
import { Body, Label, Line, Name, Pill, Provenance, QuietLine, Screen, Small, Sprig, usePalette } from "@/ui";

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

export interface PortraitViewProps {
  personId: string;
  name: string | null;
  label: string | null;
  remembered: boolean;
  /** "You reached out · Oct 6" (H10). */
  reachedOut?: string | null;
  /** Tapping the name corrects it (H1). */
  onRename?: () => void;
  lately: PortraitLineData[];
  comingUp: PortraitLineData[];
  youSaid: PortraitLineData[];
  between: PortraitLineData[];
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
function Section({ title, lines, ochre, leadWithWhen, onLine, onSource }: {
  title: string;
  lines: PortraitLineData[];
  ochre?: boolean;
  leadWithWhen?: boolean;
  onLine: (id: string) => void;
  onSource: (noteId: string) => void;
}) {
  const p = usePalette();
  if (!lines.length) return null;
  return (
    <View style={{ marginTop: space.x3, paddingTop: space.l, borderTopWidth: 1, borderTopColor: p.hairline }}>
      <Label tone={ochre ? "ochreText" : "inkBody"} accessibilityRole="header">{title}</Label>
      {lines.map((l, i) => {
        const text = withWhen(l, leadWithWhen);
        // One source line for several memories only when they came from the
        // very same note; neighbours from different notes each say their own
        // (founder H14, H19b).
        const next = i + 1 < lines.length ? lines[i + 1] : null;
        const nextShares = !!next && !next.fixed && !!l.noteId && next.noteId === l.noteId && next.provenance === l.provenance;
        return (
          <View key={l.itemId} style={{ marginTop: i === 0 ? space.m : space.s }}>
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
          </View>
        );
      })}
    </View>
  );
}

export function PortraitView(props: PortraitViewProps) {
  const p = usePalette();
  if (!props.name) {
    return (
      <Screen onBack={props.onBack}>
        <Body>{"This person isn't here any more."}</Body>
      </Screen>
    );
  }
  const first = props.name.trim().split(/\s+/u)[0];
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
    <Screen onBack={props.onBack} footer={footer}>
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
          {props.remembered ? <Small style={{ marginTop: space.xs }}>Remembered</Small> : null}
          {props.reachedOut ? <Small style={{ marginTop: space.xs }}>{props.reachedOut}</Small> : null}
        </View>
        <Sprig personId={props.personId} width={size.sprig.page} remembered={props.remembered} />
      </View>

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


      <Section title="Lately" lines={props.lately} onLine={props.onLine} onSource={props.onSource} />
      <Section title="Coming up" lines={props.comingUp} leadWithWhen onLine={props.onLine} onSource={props.onSource} />
      <Section title="You said you'd" lines={props.youSaid} ochre onLine={props.onLine} onSource={props.onSource} />
      <Section title="Between you" lines={props.between} onLine={props.onLine} onSource={props.onSource} />
      {empty ? (
        <View style={{ marginTop: space.xl, alignItems: "flex-start" }}>
          <Body>{`What you tell Kinship about ${first} will be here: what's going on with them, what's coming up, what you said you'd do.`}</Body>
          <View style={{ marginTop: space.l }}>
            <Pill label={`Tell Kinship about ${first}`} onPress={props.onTell} />
          </View>
        </View>
      ) : null}

      {props.total > 0 ? (
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
