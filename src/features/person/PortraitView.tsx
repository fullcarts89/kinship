// The relationship page (Design Direction §I.7; board 2, "David Reyes"):
// their name in the display serif with their sprig, then only the sections
// that have something to say: Lately, Coming up, You said you'd, Between
// you. Every line says where it came from; tap a line to correct it, tap its
// provenance for the note. Message, Call and Tell sit at the bottom.
import React from "react";
import { Pressable, View } from "react-native";
import { MessageCircle, PenLine, Phone } from "lucide-react-native";
import { GUTTER, height, radius, size, space } from "@/design/tokens";
import { Body, IconButton, Label, Line, Name, Pill, Provenance, Screen, Small, Sprig, usePalette } from "@/ui";

export interface PortraitLineData {
  itemId: string;
  statement: string;
  when: string | null;
  provenance: string;
  noteId: string | null;
  /** From the person's record (a contact's birthday): shown, not corrected here. */
  fixed?: boolean;
}

export interface PortraitViewProps {
  personId: string;
  name: string | null;
  label: string | null;
  remembered: boolean;
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
  /** What happened to a note just told from here ("Kept: …", Undo). */
  kept?: React.ReactNode;
  children?: React.ReactNode;
}

function withWhen(l: PortraitLineData): string {
  if (!l.when || l.when === "No date yet") return l.statement;
  const plain = l.when.replace(/[“”]/gu, "");
  return l.statement.toLocaleLowerCase().includes(plain.toLocaleLowerCase()) ? l.statement : `${l.statement} · ${l.when}`;
}

function Section({ title, lines, ochre, onLine, onSource }: {
  title: string;
  lines: PortraitLineData[];
  ochre?: boolean;
  onLine: (id: string) => void;
  onSource: (noteId: string) => void;
}) {
  if (!lines.length) return null;
  return (
    <View style={{ marginTop: space.xl }}>
      <Label tone={ochre ? "ochreText" : "inkQuiet"} accessibilityRole="header">{title}</Label>
      {lines.map((l) => (
        <View key={l.itemId} style={{ marginTop: space.s }}>
          {l.fixed ? (
            <Line>{withWhen(l)}</Line>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={withWhen(l)}
              accessibilityHint="Double-tap to correct it"
              onPress={() => onLine(l.itemId)}
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
            >
              <Line>{withWhen(l)}</Line>
            </Pressable>
          )}
          <View style={{ marginTop: space.xs }}>
            <Provenance line={l.provenance} onPress={l.noteId ? () => onSource(l.noteId as string) : undefined} />
          </View>
        </View>
      ))}
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
    <View style={{ flexDirection: "row", gap: space.s, paddingHorizontal: GUTTER, paddingTop: space.m, paddingBottom: space.m }}>
      <Pill
        variant="primary"
        label="Message"
        style={{ flex: 1 }}
        icon={({ color, size: s, strokeWidth }) => <MessageCircle color={color} size={s} strokeWidth={strokeWidth} />}
        onPress={props.onMessage}
      />
      <Pill
        label="Call"
        style={{ flex: 1 }}
        icon={({ color, size: s, strokeWidth }) => <Phone color={color} size={s} strokeWidth={strokeWidth} />}
        onPress={props.onCall}
      />
      <View style={{ borderWidth: 1, borderColor: p.rule, borderRadius: radius.pill(height.button) }}>
        <IconButton label={`Tell Kinship about ${first}`} onPress={props.onTell} diameter={height.button - 2}>
          <PenLine color={p.ink} size={size.icon} strokeWidth={1.8} />
        </IconButton>
      </View>
    </View>
    </View>
  );
  return (
    <Screen onBack={props.onBack} footer={footer}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.l }}>
        <View style={{ flex: 1, paddingTop: space.s }}>
          <Name>{props.name}</Name>
          {props.label ? <Small style={{ marginTop: space.s }}>{props.label}</Small> : null}
          {props.remembered ? <Small style={{ marginTop: space.xs }}>Remembered</Small> : null}
        </View>
        <Sprig personId={props.personId} width={size.sprig.page} remembered={props.remembered} />
      </View>


      <Section title="Lately" lines={props.lately} onLine={props.onLine} onSource={props.onSource} />
      <Section title="Coming up" lines={props.comingUp} onLine={props.onLine} onSource={props.onSource} />
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
            marginTop: space.x3, paddingTop: space.m, borderTopWidth: 1, borderTopColor: p.hairline, opacity: pressed ? 0.6 : 1,
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
