// A person's notebook (PR #77 §8; founder directive 2 Nov 2026), behind `notebook_deck`:
//
//   the header    their photo (the user's own choice) with their flower, or their colour, initial and
//                 big flower; the name in Archivo; the relation in italic serif; Message · Call · Tell.
//                 Edit and the photo sit as two quiet controls under the relation; a merge's Undo and a
//                 Paused / Remembered line follow them, as built.
//   the loop      the return check, SUA-1's one question, "Anything worth remembering…?", in the raised
//                 panel, then the Kept card, notes still open and "Is this the …?" checks.
//   three lenses  Now (the Portrait rules, unchanged), Pages (the notes in full, newest first, with the
//                 times the user showed up), Knows (What Kinship knows, in its sections). The last lens
//                 used for a person is kept for the session.
//   sparse        nothing told yet: no lenses; the invitation, a Contacts birthday, Tell Kinship.
//
// Nothing counts, ranks or scores the person; time is the only order. Every line shows its source.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, MessageCircle, PenLine, Phone, Search, Sprout } from "lucide-react-native";
import { font, maxScale, motion, notebook, notebookShadow, press, size, space, TOUCH } from "@/design/tokens";
import { Pressable } from "@/ui/Pressable";
import { Emphasis, isLargeText, useLineFocus, usePalette, useReduceMotion } from "@/ui";
import { PAUSE_COPY } from "@/store/peopleStates";
import { Face, flowers, initialOf, LensTabs, Lbl, NButton, NSource, NText, Raised, RuledPaper, useNotebookPalette, personLook } from "@/ui/notebook";
import type { PortraitLineData, TrailLineData } from "@/features/person/PortraitView";
import { IN_TOUCH, PHOTO_ACTION } from "@/features/person/PortraitView";
import type { LineFact } from "@/hooks/usePages";
import { dateBlock, findInPages, findRanges, PAGES_COPY, pageDay, withYears, type NotePage, type PageEntry } from "./pagesModel";
import { MarkedWords, NotebookLine, pagesType, PrivateSource, SolidBack, sourceKind, SproutRow, Was } from "./parts";

export type Lens = "now" | "pages" | "knows";
export const LENSES: { key: Lens; label: string }[] = [
  { key: "now", label: "Now" },
  { key: "pages", label: "Pages" },
  { key: "knows", label: "Knows" },
];

export const NOTEBOOK_COPY = {
  invitation: (first: string) => `What you tell Kinship about ${first} will be here: what's going on with them, what's coming up, what you said you'd do.`,
  example: "For example: what they're looking forward to, something they told you, or something you said you'd do. Ideas for showing up appear once there's something to go on.",
  tellAbout: (first: string) => `Tell Kinship about ${first}`,
  knows: (first: string) => `What Kinship knows about ${first}`,
  edit: "Edit",
  planNote: "Kinship records only the kind of thing you did, never what you wrote.",
  check: "One thing to check",
  pagesEmpty: (first: string) => `What you tell Kinship about ${first} will be here.`,
  birthday: (first: string) => `${first}'s birthday`,
} as const;

export interface PersonNotebookProps {
  personId: string;
  name: string | null;
  loading?: boolean;
  short?: string | null;
  label: string | null;
  pronouns?: string | null;
  /** The note behind their relation, when one is known: the relation opens it. */
  labelNoteId?: string | null;
  remembered: boolean;
  stateLine?: string | null;
  stateExplain?: string | null;
  merged?: { id: string; line: string }[];
  onUndoMerge?: (mergeId: string) => void;
  onRename?: () => void;
  photoUri?: string | null;
  onPhoto?: () => void;
  lately: PortraitLineData[];
  comingUp: PortraitLineData[];
  youSaid: PortraitLineData[];
  between: PortraitLineData[];
  trail?: TrailLineData[];
  /** Everything Kinship keeps about them; with no conversation either, the page is sparse. */
  total: number;
  /** What the Now lens needs to know about a line: private, its exact day. */
  facts: Record<string, LineFact>;
  /** Their Contacts birthday (an ISO day), for the sparse page. */
  contactsBirthday?: string | null;
  /** Pages, newest first; null while being read. */
  pages: PageEntry[] | null;
  lens: Lens;
  onLens: (lens: Lens) => void;
  focusItemId?: string | null;
  /** `note=`: Pages scrolls to that note and rings it. */
  focusNoteId?: string | null;
  onBack: () => void;
  onLine: (itemId: string) => void;
  onSource: (noteId: string) => void;
  onMessage: () => void;
  onCall: () => void;
  onTell: () => void;
  onInTouch?: () => void;
  hasDraft?: boolean;
  kept?: React.ReactNode;
  waiting?: { captureId: string; label: string; text: string; action: string | null }[];
  onWaiting?: (captureId: string) => void;
  links?: { key: string; prompt: string }[];
  onLink?: (key: string, yes: boolean) => void;
  returnCheck?: { ask: string; about: string | null; type?: string } | null;
  onReturn?: (answer: "yes" | "not_yet" | "put_aside") => void;
  afterGesture?: { ask: string } | null;
  onGesture?: (answer: "yes" | "not_yet") => void;
  afterReturn?: { followUp: string } | null;
  onRemember?: () => void;
  onNothing?: () => void;
  /** "In Sam's notebook: You messaged · Nov 4" under "Anything worth remembering…?" once it is recorded. */
  ack?: string | null;
  /** "Ideas for showing up" (Showing Up's own control), after Between you. */
  ideas?: React.ReactNode;
  /** The Knows lens, told where its sections and lines sit (to land on a line). */
  knows?: (layout: { onLayoutGroup: (group: string, y: number) => void; onLayoutLine: (group: string, id: string, y: number) => void }) => React.ReactNode;
  now?: Date;
  children?: React.ReactNode;
}

function transparent(c: string): string {
  return /^#[0-9a-f]{6}$/iu.test(c) ? `${c}00` : "transparent";
}

function withWhen(l: PortraitLineData): string {
  if (!l.when || l.when === "No date yet") return l.statement;
  const plain = l.when.replace(/[“”]/gu, "");
  if (l.statement.toLocaleLowerCase().includes(plain.toLocaleLowerCase())) return l.statement;
  return `${l.statement} · ${l.when}`;
}

/** The page's media: their photo with their flower, or their colour, initial and big flower; a fade to paper. */
function Media({ personId, first, photoUri }: { personId: string; first: string; photoUri: string | null }) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const look = personLook(personId);
  const H = notebook.personMedia;
  const photoH = Math.max(width, H);
  return (
    <View style={{ height: H, overflow: "hidden", backgroundColor: photoUri ? p.paper : look.color }} accessible={!!photoUri} accessibilityRole={photoUri ? "image" : undefined} accessibilityLabel={photoUri ? `Photo of ${first}` : undefined} importantForAccessibility={photoUri ? "yes" : "no-hide-descendants"}>
      {photoUri ? (
        <>
          {/* Cover, set a quarter of the way down (faces sit high in a portrait). */}
          <Image source={{ uri: photoUri }} style={{ position: "absolute", left: 0, width, height: photoH, top: -(photoH - H) * 0.25 }} resizeMode="cover" />
          <Image source={flowers[look.flower]} resizeMode="contain" style={{ position: "absolute", width: 112, height: 112, right: -16, bottom: 8, transform: [{ rotate: "-14deg" }] }} />
        </>
      ) : (
        <>
          <Text allowFontScaling={false} style={{ position: "absolute", left: 14, top: 60, fontFamily: font.poster, fontSize: 240, lineHeight: 240 * 0.8 + 40, color: p.ink, opacity: 0.09 }}>
            {initialOf(first)}
          </Text>
          <Image source={flowers[look.flower]} resizeMode="contain" style={{ position: "absolute", width: 300, height: 300, right: -50, top: 40, transform: [{ rotate: "-10deg" }] }} />
        </>
      )}
      <LinearGradient pointerEvents="none" colors={[transparent(p.paper), p.paper]} locations={[0.58, 0.98]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
    </View>
  );
}

/** The raised panel of the return loop (`.panel` + renderRC). */
function Panel({ personId, name, children }: { personId: string; name: string; children: React.ReactNode }) {
  return (
    <Raised large style={{ marginHorizontal: 14, marginTop: 18 }}>
      <View accessibilityLiveRegion="polite">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Face personId={personId} name={name} size={34} />
          <NText v="cap" tone="ink2">{name}</NText>
        </View>
        {children}
      </View>
    </Raised>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>{children}</View>;
}

/** Tracks a lens's sections inside the page, so a focused line is found wherever the lens sits. */
function useNestedFocus(focusId: string | null | undefined, scroll: React.RefObject<ScrollView | null>) {
  const focus = useLineFocus(focusId, scroll);
  // The lenses' block within the page, and the lens content within that block.
  const outer = useRef<number | null>(null);
  const inner = useRef<number | null>(null);
  const groups = useRef<Record<string, number>>({});
  const replay = () => {
    if (outer.current === null || inner.current === null) return;
    for (const [g, gy] of Object.entries(groups.current)) focus.onGroup(g, outer.current + inner.current + gy);
  };
  return {
    onOuter: (y: number) => {
      outer.current = y;
      replay();
    },
    onInner: (y: number) => {
      inner.current = y;
      replay();
    },
    onGroup: (g: string, y: number) => {
      groups.current[g] = y;
      replay();
    },
    onLine: focus.onLine,
  };
}

type Focus = ReturnType<typeof useNestedFocus>;

/** One section of the page: its own card, with a title that reads as one (founder, 5 Nov 2026). */
function Section({ title, dot, group, focus, children }: { title: string; dot?: string; group: string; focus: Focus; children: React.ReactNode }) {
  return (
    <View onLayout={(e) => focus.onGroup(group, e.nativeEvent.layout.y)} style={{ marginTop: space.m }}>
      <Raised large>
        <Lbl section dot={dot} style={{ marginBottom: space.s }}>{title}</Lbl>
        {children}
      </Raised>
    </View>
  );
}

/** A Coming up row: the white date block, the line, its source. */
function ComingRow({ l, fact, first, onLine, onSource }: { l: PortraitLineData; fact?: LineFact; first: string; onLine: (id: string) => void; onSource: (id: string) => void }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const block = fact?.day ? dateBlock(fact.day) : null;
  if (!block) {
    return <NotebookLine text={withWhen(l)} provenance={l.provenance} sensitive={fact?.sensitive} was={l.was}
      onPress={l.fixed ? undefined : () => onLine(l.itemId)} onSource={l.noteId ? () => onSource(l.noteId as string) : undefined} />;
  }
  const text = l.itemId === "birthday" ? NOTEBOOK_COPY.birthday(first) : l.statement;
  const body = (
    <View style={{ flexDirection: isLargeText() ? "column" : "row", gap: 14, paddingVertical: 10, alignItems: "flex-start" }}>
      <View style={{ width: 54, borderRadius: 14, backgroundColor: p.paper, paddingTop: space.s, paddingBottom: 7, alignItems: "center" }}>
        <NText v="dayCap" tone="quiet">{block.weekday}</NText>
        <Text maxFontSizeMultiplier={maxScale.display} style={{ fontFamily: font.poster, fontSize: 22, lineHeight: 22, color: p.ink, marginTop: space.xs, textAlign: "center" }}>{block.date}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <NText v="serif18">{text}</NText>
        <View style={{ marginTop: space.xs }}>
          {fact?.sensitive ? <PrivateSource /> : (
            <NSource kind={sourceKind(l.provenance)} label={l.provenance} onPress={l.noteId && !l.fixed ? () => onSource(l.noteId as string) : undefined} />
          )}
        </View>
        {l.was ? <Was was={l.was} /> : null}
      </View>
    </View>
  );
  if (l.fixed) return <View accessible accessibilityLabel={`${block.weekday} ${block.date}. ${text}. ${l.provenance}`}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${block.date}. ${text}`} accessibilityHint="Opens this line" onPress={() => onLine(l.itemId)}
      style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}>
      {body}
    </Pressable>
  );
}

function NowLens(props: PersonNotebookProps & { first: string; focus: Focus }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const { first, focus, facts } = props;
  const lineAt = (group: string, id: string, child: React.ReactNode) => (
    <View key={id} onLayout={(e) => focus.onLine(group, id, e.nativeEvent.layout.y)}>
      <Emphasis on={!!props.focusItemId && props.focusItemId === id}>{child}</Emphasis>
    </View>
  );
  const src = (l: PortraitLineData) => (l.noteId ? () => props.onSource(l.noteId as string) : undefined);
  const trail = props.trail ?? [];
  return (
    <View>
      {props.comingUp.length ? (
        <Section title="Coming up" group="coming" focus={focus}>
          {props.comingUp.map((l) => lineAt("coming", l.itemId, <ComingRow l={l} fact={facts[l.itemId]} first={first} onLine={props.onLine} onSource={props.onSource} />))}
        </Section>
      ) : null}
      {props.youSaid.length ? (
        <Section title="You said you'd" dot={n.yours} group="yours" focus={focus}>
          {props.youSaid.map((l) => lineAt("yours", l.itemId, (
            <NotebookLine yours text={withWhen(l)} was={l.was} provenance={l.provenance} sensitive={facts[l.itemId]?.sensitive} onPress={() => props.onLine(l.itemId)} onSource={src(l)} />
          )))}
        </Section>
      ) : null}
      {props.lately.length ? (
        <Section title="Lately" dot={p.bloom} group="lately" focus={focus}>
          {props.lately.map((l) => lineAt("lately", l.itemId, (
            <NotebookLine text={withWhen(l)} was={l.was} provenance={l.provenance} sensitive={facts[l.itemId]?.sensitive} onPress={() => props.onLine(l.itemId)} onSource={src(l)} />
          )))}
        </Section>
      ) : null}
      {props.between.length || trail.length ? (
        <Section title="Between you" dot={n.green} group="between" focus={focus}>
          {trail.map((t) => <SproutRow key={t.id} title={t.label} about={t.about} />)}
          {props.between.map((l) => lineAt("between", l.itemId, (
            <SproutRow title={l.statement} about={facts[l.itemId]?.sensitive ? "Private · you said yes" : l.provenance} onPress={() => props.onLine(l.itemId)} />
          )))}
        </Section>
      ) : null}
      {props.ideas ? <View style={{ marginTop: 18 }}>{props.ideas}</View> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Shows the Knows lens"
        onPress={() => props.onLens("knows")}
        style={({ pressed }) => ({ marginTop: 18, minHeight: TOUCH, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", opacity: pressed ? press.link : 1 })}
      >
        <NText v="strong15" tone="ink2">{NOTEBOOK_COPY.knows(first)}</NText>
        <ChevronRight color={n.ink2} size={18} strokeWidth={1.8} />
      </Pressable>
      {props.onInTouch ? (
        <View style={{ alignItems: "flex-start", marginTop: space.s }}>
          <NButton small variant="ghost" label={IN_TOUCH.action} accessibilityHint={IN_TOUCH.title(first)} onPress={props.onInTouch} />
        </View>
      ) : null}
    </View>
  );
}

function NoteCard({ e, now, query, target, onLine }: { e: NotePage; now: Date; query: string; target: boolean; onLine: (id: string) => void }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const cap = `${pageDay(e.at, now)} · ${e.intention ? PAGES_COPY.saved : PAGES_COPY.told}`;
  return (
    <View
      testID={target ? "target-note" : `note-${e.captureId}`}
      style={[
        { borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderTopRightRadius: 18, borderBottomRightRadius: 18, backgroundColor: n.sheet, ...notebookShadow.card },
        target ? { borderWidth: 3, borderColor: p.butter } : null,
      ]}
    >
      <RuledPaper lineHeight={notebook.ruled.pages} style={{ borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderTopRightRadius: 18, borderBottomRightRadius: 18, paddingTop: 14, paddingBottom: 14, paddingLeft: 22, paddingRight: space.l }}>
        <NText v="cap" tone="quiet" style={{ fontSize: 10.5 }}>{cap}</NText>
        <View style={{ marginTop: 6 }}>
          {e.text ? (
            <MarkedWords
              text={e.text}
              spans={e.spans}
              found={query ? findRanges(e.text, query) : []}
              style={pagesType}
              onLine={onLine}
            />
          ) : (
            <View>
              <NText v="small" tone="quiet">{PAGES_COPY.removed}</NText>
              {e.quotes.map((q) => <NText key={q} v="quote18" style={{ marginTop: space.s }}>{`“${q}”`}</NText>)}
            </View>
          )}
        </View>
      </RuledPaper>
    </View>
  );
}

function PagesLens(props: PersonNotebookProps & { first: string; focus: Focus; now: Date }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const [query, setQuery] = useState("");
  const entries = props.pages ?? [];
  const shown = findInPages(entries, query);
  const rows = withYears(shown, props.now);
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: space.xs }}>
      <View style={{ marginTop: space.l, marginBottom: 6, minHeight: 50, borderRadius: 25, backgroundColor: n.card, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, ...notebookShadow.card }}>
        <Search color={n.quiet} size={20} strokeWidth={1.8} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={PAGES_COPY.find(props.first)}
          placeholderTextColor={n.quiet}
          accessibilityLabel={PAGES_COPY.find(props.first)}
          autoCorrect={false}
          returnKeyType="search"
          maxFontSizeMultiplier={maxScale.text}
          style={{ flex: 1, minHeight: TOUCH, fontFamily: font.sans, fontSize: 16, color: p.ink }}
        />
      </View>
      <View onLayout={(e) => props.focus.onGroup("pages", e.nativeEvent.layout.y)} style={{ paddingTop: 10 }}>
        {rows.length ? <View pointerEvents="none" style={{ position: "absolute", left: 15, top: 36, bottom: 0, width: 1.5, backgroundColor: p.hairline }} /> : null}
        {!entries.length && props.pages ? <NText v="fine" tone="quiet" style={{ marginLeft: 34 }}>{NOTEBOOK_COPY.pagesEmpty(props.first)}</NText> : null}
        {entries.length && !shown.length ? <NText v="fine" tone="quiet" style={{ marginLeft: 34 }}>{PAGES_COPY.nothingFound}</NText> : null}
        {rows.map((r) => {
          if (r.type === "year") {
            return <Text key={r.key} maxFontSizeMultiplier={maxScale.display} accessibilityRole="header" style={{ marginLeft: 34, marginTop: space.s, marginBottom: 14, fontFamily: font.poster, fontSize: 20, lineHeight: 20, color: p.ink, opacity: 0.25 }}>{String(r.year)}</Text>;
          }
          const show = r.type === "show";
          return (
            <View key={r.key} onLayout={r.type === "note" ? (ev) => props.focus.onLine("pages", r.captureId, ev.nativeEvent.layout.y) : undefined} style={{ marginLeft: 34, marginBottom: 16 }}>
              <View style={[
                { position: "absolute", left: -26, top: show ? 14 : 18, width: 12, height: 12, borderRadius: 6 },
                show ? { backgroundColor: n.green } : { backgroundColor: p.paper, borderWidth: 2, borderColor: n.ink2 },
              ]} />
              {r.type === "show" ? (
                <View accessible accessibilityLabel={r.about ? `${r.title}. ${r.about}` : r.title} style={{ backgroundColor: n.greenTint, borderRadius: 16, paddingVertical: space.m, paddingHorizontal: 14 }}>
                  <NText v="strong15">{r.title}</NText>
                  {r.about ? <NText v="quote15" tone="ink2">{r.about}</NText> : null}
                </View>
              ) : (
                <NoteCard e={r} now={props.now} query={query} target={!!props.focusNoteId && props.focusNoteId === r.captureId} onLine={props.onLine} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** The lens content arrives with a short slide (a fade with Reduce Motion); the header stays. */
function LensMotion({ lens, children, onLayoutY }: { lens: Lens; children: React.ReactNode; onLayoutY: (y: number) => void }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    v.setValue(0);
    const run = Animated.timing(v, { toValue: 1, duration: reduce ? motion.reduced.duration : 200, useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [lens, reduce, v]);
  const shift = reduce ? 0 : 16;
  return (
    <Animated.View onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)} style={{ opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [shift, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

export function PersonNotebookView(props: PersonNotebookProps) {
  const p = usePalette();
  const n = useNotebookPalette();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const now = props.now ?? new Date();
  const focusTarget = props.lens === "pages" ? props.focusNoteId : props.focusItemId;
  const focus = useNestedFocus(focusTarget, scroll);
  if (!props.name) {
    return (
      <View style={{ flex: 1, backgroundColor: p.paper }}>
        <SolidBack onPress={props.onBack} style={{ position: "absolute", top: insets.top + 10, left: 14, zIndex: 5 }} />
        {props.loading ? null : <NText v="body16" tone="ink2" style={{ marginTop: insets.top + 80, marginHorizontal: 24 }}>{"This person isn't here any more."}</NText>}
      </View>
    );
  }
  const first = props.short?.trim() || props.name.trim().split(/\s+/u)[0];
  const words = props.name.trim().split(/\s+/u);
  const nameLines = words.length > 1 ? `${words[0]}\n${words.slice(1).join(" ")}` : words[0];
  // Nothing told yet: no lenses (a Contacts birthday doesn't count, and neither does a note still open).
  const sparse = props.total === 0 && !(props.trail?.length);
  const stacked = isLargeText();
  const grow = stacked ? undefined : 1;
  const state = props.stateLine ?? (props.remembered ? PAUSE_COPY.line : null);

  const loop = props.afterGesture ? (
    <Panel personId={props.personId} name={props.name}>
      <NText v="serif20">{props.afterGesture.ask}</NText>
      <Row>
        <NButton small label="Yes" onPress={() => props.onGesture?.("yes")} />
        <NButton small variant="ghost" label="Not yet" onPress={() => props.onGesture?.("not_yet")} />
      </Row>
      <NText v="fine" tone="quiet" style={{ marginTop: 10 }}>{NOTEBOOK_COPY.planNote}</NText>
    </Panel>
  ) : props.afterReturn ? (
    <Panel personId={props.personId} name={props.name}>
      <NText v="serif20">{props.afterReturn.followUp}</NText>
      <Row>
        <NButton small label="Tell Kinship" icon={(i) => <PenLine {...i} />} onPress={() => props.onRemember?.()} />
        <NButton small variant="ghost" label="Nothing today" onPress={() => props.onNothing?.()} />
      </Row>
      {props.ack ? (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: space.m }}>
          <SproutIcon />
          <NText v="body15" tone="ink2" style={{ flex: 1 }}>{props.ack}</NText>
        </View>
      ) : null}
    </Panel>
  ) : props.returnCheck ? (
    <Panel personId={props.personId} name={props.name}>
      <NText v="serif20">{props.returnCheck.ask}</NText>
      {props.returnCheck.about ? <NText v="small" tone="quiet" style={{ marginTop: space.xs }}>{props.returnCheck.about}</NText> : null}
      <Row>
        <NButton small label="Yes" onPress={() => props.onReturn?.("yes")} />
        <NButton small variant="ghost" label="Not yet" onPress={() => props.onReturn?.("not_yet")} />
        {props.returnCheck.type === "promise" ? <NButton small variant="ghost" label="Didn't happen" onPress={() => props.onReturn?.("put_aside")} /> : null}
      </Row>
    </Panel>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space.x4 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Media personId={props.personId} first={first} photoUri={props.photoUri ?? null} />
        <View style={{ paddingHorizontal: 24, marginTop: -54 }}>
          <NText v="name" accessibilityLabel={props.name}>{nameLines}</NText>
          {props.label ? (
            props.labelNoteId ? (
              <Pressable accessibilityRole="link" accessibilityLabel={props.label} accessibilityHint="Opens where this came from" onPress={() => props.onSource(props.labelNoteId as string)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.s, marginTop: 10, alignSelf: "flex-start", opacity: pressed ? press.link : 1 })}>
                <NText v="quote18" tone="ink2" style={{ flexShrink: 1 }}>{props.label}</NText>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: n.green }} />
              </Pressable>
            ) : <NText v="quote18" tone="ink2" style={{ marginTop: 10 }}>{props.label}</NText>
          ) : null}
          {props.pronouns ? <NText v="small" tone="ink2" style={{ marginTop: space.xs }}>{props.pronouns}</NText> : null}
          {/* Edit (name, pronouns, Pause reminders, Merge, Remove) and the user's own photo: quiet, under the relation. */}
          {props.onRename || props.onPhoto ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.l, marginTop: space.xs }}>
              {props.onRename ? <QuietControl label={NOTEBOOK_COPY.edit} hint={`Change ${first}'s name or pronouns, pause reminders, merge or remove from People`} onPress={props.onRename} /> : null}
              {props.onPhoto ? <QuietControl label={props.photoUri ? PHOTO_ACTION.change : PHOTO_ACTION.add} hint={`A photo of ${first} from your library. It stays on this phone`} onPress={props.onPhoto} /> : null}
            </View>
          ) : null}
          {props.merged?.map((m) => (
            <View key={m.id} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.m }}>
              <NText v="small" tone="ink2">{m.line}</NText>
              {props.onUndoMerge ? <QuietControl label="Undo" a11y={`Undo: ${m.line}`} onPress={() => props.onUndoMerge?.(m.id)} /> : null}
            </View>
          ))}
          {state ? (
            <NText v="strong15" style={{ marginTop: space.s }} accessibilityLabel={`${state}. ${props.stateExplain ?? ""}`.trim()}>{state}</NText>
          ) : null}
        </View>
        <View style={{ flexDirection: stacked ? "column" : "row", gap: space.s, paddingHorizontal: 20, paddingTop: 18 }}>
          <NButton small flex={grow} full={stacked} label="Message" icon={(i) => <MessageCircle {...i} />} onPress={props.onMessage} />
          <NButton small flex={grow} full={stacked} variant="ghost" label="Call" icon={(i) => <Phone {...i} />} onPress={props.onCall} />
          <NButton small flex={grow} full={stacked} variant="ghost" label="Tell" accessibilityLabel={`Tell Kinship about ${first}`}
            accessibilityHint={props.hasDraft ? "Opens your unsent note" : undefined} icon={(i) => <PenLine {...i} />} onPress={props.onTell} />
        </View>
        {props.kept ? <View style={{ paddingHorizontal: 20, marginTop: space.m }}>{props.kept}</View> : null}
        {loop}
        {props.links?.map((l) => (
          <Raised key={l.key} large style={{ marginHorizontal: 14, marginTop: space.m }}>
            <View accessibilityLabel={l.prompt}>
              <NText v="cap" tone="ink2">{NOTEBOOK_COPY.check}</NText>
              <NText v="serif18" style={{ marginTop: 6 }}>{l.prompt}</NText>
              <Row>
                <NButton small label="Yes" onPress={() => props.onLink?.(l.key, true)} />
                <NButton small variant="ghost" label="No, someone else" onPress={() => props.onLink?.(l.key, false)} />
              </Row>
            </View>
          </Raised>
        ))}
        {props.waiting?.map((w) => (
          <Raised key={w.captureId} large style={{ marginHorizontal: 14, marginTop: space.m }}>
            <NText v="cap" tone="ink2">{w.label}</NText>
            <NText v="serif18" style={{ marginTop: 6 }}>{w.text}</NText>
            {w.action ? (
              <Row>
                <NButton small variant="ghost" label={w.action} onPress={() => props.onWaiting?.(w.captureId)} />
              </Row>
            ) : null}
          </Raised>
        ))}

        {sparse ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 22 }}>
            <NText v="serif21">{NOTEBOOK_COPY.invitation(first)}</NText>
            {props.contactsBirthday ? (() => {
              const b = dateBlock(props.contactsBirthday);
              return b ? (
                <View accessible accessibilityLabel={`${NOTEBOOK_COPY.birthday(first)}, ${b.date}. From Contacts`} style={{ flexDirection: "row", gap: 14, marginTop: space.m, alignItems: "flex-start" }}>
                  <View style={{ width: 54, borderRadius: 14, backgroundColor: n.card, paddingTop: space.s, paddingBottom: 7, alignItems: "center" }}>
                    <NText v="dayCap" tone="quiet">{b.date.split(" ")[0].toUpperCase()}</NText>
                    <Text maxFontSizeMultiplier={maxScale.display} style={{ fontFamily: font.poster, fontSize: 22, lineHeight: 22, color: p.ink, marginTop: space.xs }}>{b.date.split(" ")[1]}</Text>
                  </View>
                  <View style={{ flex: 1, paddingTop: 2 }}>
                    <NText v="serif18">{NOTEBOOK_COPY.birthday(first)}</NText>
                    <NSource kind="contacts" label="From Contacts" style={{ marginTop: space.xs }} />
                  </View>
                </View>
              ) : null;
            })() : null}
            <View style={{ marginTop: 18, alignItems: "flex-start" }}>
              <NButton label={NOTEBOOK_COPY.tellAbout(first)} icon={(i) => <PenLine {...i} />} onPress={props.onTell} />
            </View>
            <NText v="fine" tone="quiet" style={{ marginTop: 14 }}>{NOTEBOOK_COPY.example}</NText>
          </View>
        ) : (
          <View onLayout={(e) => focus.onOuter(e.nativeEvent.layout.y)}>
            <View style={{ marginTop: 22, marginHorizontal: 20, marginBottom: space.xs }}>
              <LensTabs lenses={LENSES} current={props.lens} onChange={props.onLens} />
            </View>
            <LensMotion lens={props.lens} onLayoutY={focus.onInner}>
              {props.lens === "now" ? (
                <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
                  <NowLens {...props} first={first} focus={focus} />
                </View>
              ) : props.lens === "pages" ? (
                <PagesLens {...props} first={first} focus={focus} now={now} />
              ) : (
                <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>{props.knows?.({ onLayoutGroup: focus.onGroup, onLayoutLine: focus.onLine })}</View>
              )}
            </LensMotion>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      <SolidBack onPress={props.onBack} style={{ position: "absolute", top: insets.top + 10, left: 14, zIndex: 5 }} />
      {props.children}
    </View>
  );
}

function SproutIcon() {
  const n = useNotebookPalette();
  return <View style={{ marginTop: 1 }}><Sprout color={n.green} size={size.iconLarge - 2} strokeWidth={1.8} /></View>;
}

/** A quiet small control (Edit, Add a photo, Undo): the words alone, 44 pt tall to the touch. */
function QuietControl({ label, hint, a11y, onPress }: { label: string; hint?: string; a11y?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityHint={hint} onPress={onPress}
      style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.link : 1 })}>
      <NText v="strong14" tone="ink2" style={{ textDecorationLine: "underline" }}>{label}</NText>
    </Pressable>
  );
}
