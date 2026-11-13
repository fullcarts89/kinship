// Showing Up's views (PR #77 §4–§5; proto.css `.ideas-tog`, `.idea`, `.ground`, `.way`, `.whenchips`,
// `.keepbox`): the explicit "Ideas for showing up" control, the idea cards (category, title, the user's
// own words, the source), the assist content ("Ways to do it") and Keep it in mind. Nothing here sends,
// buys, books or invites; doing nothing is always fine.
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Bookmark, Check, ChevronDown, ChevronRight, Clock, MessageCircle, Phone, Sprout, X } from "lucide-react-native";
import { font, ideaTint, motion, notebookShadow, press, space, TOUCH } from "@/design/tokens";
import { DatePane } from "@/features/tell/Pickers";
import { Pressable } from "@/ui/Pressable";
import { useReduceMotion, usePalette } from "@/ui";
import { CategoryTag, IconWell, Lbl, NButton, NSource, NText, Raised, useNotebookPalette } from "@/ui/notebook";
import { CATEGORY_LABEL, keepDays, type Idea, type IdeaCategory } from "./ideas";

export const SHOWING_UP_COPY = {
  toggle: "Ideas for showing up",
  toggleSub: (name: string) => `From what you've told Kinship about ${name}`,
  sheetNote: "Only from what you've told Kinship. Nothing here is a task.",
  ways: "Ways to do it",
  message: (name: string) => `Message ${name}`,
  messageSub: "Opens Messages. Nothing is written or sent for you.",
  call: (name: string) => `Call ${name}`,
  callSub: "Opens Phone.",
  keep: "Keep it in mind",
  keepSub: "Kinship brings it back on the day you pick.",
  onday: "Nothing to set",
  ondaySub: (name: string) => `Kinship brings ${name} back on the day itself.`,
  pick: "Pick a day",
  yourWords: "In your words · you can change them",
  keepFor: (when: string) => `Keep it for ${when}`,
  keepFine: (name: string) => `Saved on ${name}'s page under “You said you'd”, with this as its source. No reminder repeats, nothing goes overdue.`,
  already: "You already said you'd do this",
  bringBack: (when: string) => `Bring it back ${when}`,
  bringFine: "Adds a day to your own words. Nothing new is added, nothing repeats, nothing goes overdue.",
  footer: "Kinship never sends, buys, books or invites anyone for you. Doing nothing is always fine.",
  kept: (when: string, name: string) => `Kept for ${when}. It's on ${name}'s page under “You said you'd”.`,
  broughtBack: (when: string) => `Kinship brings it back ${when}.`,
} as const;

export const CATEGORY_TINT: Record<IdeaCategory, string> = {
  gesture: ideaTint.gesture, celebrate: ideaTint.celebrate, together: ideaTint.together, help: ideaTint.help,
  follow_through: ideaTint.followThrough, message: ideaTint.message, check_in: ideaTint.checkIn,
};

/** The one explicit control: closed by default; hidden when there are no ideas (zero is an answer). */
export function IdeasToggle({ name, open, onPress, chevron = "toggle" }: { name: string; open?: boolean; onPress: () => void; chevron?: "toggle" | "push" }) {
  const n = useNotebookPalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${SHOWING_UP_COPY.toggle}. ${SHOWING_UP_COPY.toggleSub(name)}`}
      accessibilityState={chevron === "toggle" ? { expanded: !!open } : undefined}
      onPress={onPress}
      testID="ideas-toggle"
      style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.m, backgroundColor: n.card, borderRadius: 20, paddingVertical: space.l, paddingHorizontal: space.l + 2, ...notebookShadow.card }}>
        <IconWell><Sprout size={20} color={n.green} strokeWidth={1.8} /></IconWell>
        <View style={{ flex: 1 }}>
          <NText v="strong16">{SHOWING_UP_COPY.toggle}</NText>
          <NText v="small" tone="quiet" style={{ marginTop: 2 }}>{SHOWING_UP_COPY.toggleSub(name)}</NText>
        </View>
        {chevron === "toggle" && open ? <ChevronDown size={22} color={n.ink2} strokeWidth={1.8} /> : <ChevronRight size={22} color={n.ink2} strokeWidth={1.8} />}
      </View>
    </Pressable>
  );
}

/** One idea: category, title, the user's own words for it, the source. The whole card opens it. */
export function IdeaCard({ idea, index, onPress }: { idea: Idea; index: number; onPress: () => void }) {
  const n = useNotebookPalette();
  const reduce = useReduceMotion();
  const g = idea.grounds[0];
  const because = g ? (g.contacts ? g.quote : `“${g.quote.replace(/^“|”$/gu, "")}”`) : "";
  return (
    <Animated.View entering={reduce ? FadeIn.duration(motion.reduced.duration) : FadeInDown.duration(motion.arrive.duration).delay(index * 60)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${CATEGORY_LABEL[idea.category]}. ${idea.title}. ${because}`}
        accessibilityHint="Shows ways to do it"
        onPress={onPress}
        testID={`idea-${idea.id}`}
        style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
      >
        <Raised style={{ paddingBottom: space.m + 2 }}>
          <CategoryTag label={CATEGORY_LABEL[idea.category]} tint={CATEGORY_TINT[idea.category]} />
          <View style={{ position: "absolute", right: space.m + 2, top: space.l + 2 }}>
            <ChevronRight size={20} color={n.quiet} strokeWidth={1.8} />
          </View>
          <NText v="strong16" style={{ marginTop: space.m - 2, marginBottom: space.s, paddingRight: space.xxl, fontSize: 17, lineHeight: 22 }}>{idea.title}</NText>
          <NText v="quote15" tone="ink2">{because}</NText>
          {g ? <NSource kind={g.contacts ? "contacts" : "note"} label={g.source} style={{ marginTop: space.s }} /> : null}
        </Raised>
      </Pressable>
    </Animated.View>
  );
}

export function IdeaList({ ideas, onIdea }: { ideas: Idea[]; onIdea: (i: Idea) => void }) {
  return (
    <View style={{ gap: space.m - 2, marginTop: space.m - 2 }}>
      {ideas.map((i, k) => <IdeaCard key={i.id} idea={i} index={k} onPress={() => onIdea(i)} />)}
    </View>
  );
}

function WayRow({ icon, title, sub, onPress, testID, children }: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress?: () => void;
  testID?: string;
  children?: React.ReactNode;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  const row = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.l - 2, paddingVertical: space.l - 2, minHeight: TOUCH }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: n.card, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <NText v="strong16">{title}</NText>
        <NText v="small" tone="quiet" style={{ marginTop: 2 }}>{sub}</NText>
      </View>
      {onPress ? <ChevronRight size={20} color={n.quiet} strokeWidth={1.8} /> : null}
    </View>
  );
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: p.hairline }}>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} onPress={onPress} testID={testID} style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}>
          {row}
        </Pressable>
      ) : <View accessible accessibilityLabel={`${title}. ${sub}`}>{row}</View>}
      {children}
    </View>
  );
}

/** "Bring it back on Saturday", "Keep it for Thursday": how a day reads in the buttons. */
function whenWords(label: string, prefix: "on" | "for"): string {
  if (label === "Tomorrow") return prefix === "on" ? "tomorrow" : "tomorrow";
  return prefix === "on" ? `on ${label}` : label;
}

function dayLabelOf(day: string): string {
  const d = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))));
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Keep it in mind (PR #77 §5): a new intention in the user's own editable words with a day, or, when the
 * idea is about a promise they already made, only a day added to it (nothing new, so nothing doubles).
 */
export function KeepBox({ idea, personName, today, onKeep, onBringBack }: {
  idea: Idea;
  personName: string;
  today: string;
  onKeep: (sentence: string, day: string, label: string) => Promise<void>;
  onBringBack: (itemId: string, day: string, label: string) => Promise<void>;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  const days = keepDays(today);
  const [pick, setPick] = useState<{ day: string; label: string }>(days[0]);
  const [choosing, setChoosing] = useState(false);
  const [text, setText] = useState(idea.keep);
  const [busy, setBusy] = useState(false);
  const own = idea.promise ?? null;
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (own) await onBringBack(own.itemId, pick.day, pick.label);
      else await onKeep(text, pick.day, pick.label);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ paddingTop: space.s + 2, paddingBottom: space.xs }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginBottom: space.m }}>
        {[...days, { day: "", label: SHOWING_UP_COPY.pick }].map((d) => {
          const on = d.day ? pick.day === d.day : choosing || !days.some((x) => x.day === pick.day);
          return (
            <Pressable
              key={d.label}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={d.day ? d.label : SHOWING_UP_COPY.pick}
              onPress={() => (d.day ? (setPick(d), setChoosing(false)) : setChoosing(true))}
              hitSlop={4}
              style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
            >
              <View style={{ minHeight: 36, borderRadius: 18, paddingHorizontal: space.l - 2, justifyContent: "center", backgroundColor: on ? p.ink : n.card, borderWidth: on ? 0 : 1.5, borderColor: p.hairline }}>
                <NText v="strong14" color={on ? p.onInk : p.ink}>{d.day || days.some((x) => x.day === pick.day) ? d.label : dayLabelOf(pick.day)}</NText>
              </View>
            </Pressable>
          );
        })}
      </View>
      {choosing ? (
        <View style={{ backgroundColor: n.card, borderRadius: 18, padding: space.m, marginBottom: space.m }}>
          <DatePane
            title={SHOWING_UP_COPY.pick}
            initial={pick.day}
            today={today}
            allowNone={false}
            onPick={(day) => {
              if (day && day >= today) setPick({ day, label: dayLabelOf(day) });
              setChoosing(false);
            }}
            onCancel={() => setChoosing(false)}
          />
        </View>
      ) : null}
      <View style={{ backgroundColor: n.yoursTint, borderRadius: 18, paddingVertical: space.l - 2, paddingHorizontal: space.l, borderLeftWidth: 3, borderLeftColor: n.yours }}>
        <NText v="cap" tone="yours" style={{ marginBottom: space.s - 2 }}>{own ? SHOWING_UP_COPY.already : SHOWING_UP_COPY.yourWords}</NText>
        {own ? (
          <NText v="serif18">{own.statement}</NText>
        ) : (
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={280}
            accessibilityLabel={SHOWING_UP_COPY.yourWords}
            testID="keep-text"
            style={{ fontFamily: font.serif, fontSize: 18, lineHeight: 25, color: p.ink, padding: 0, minHeight: 50 }}
          />
        )}
      </View>
      <View style={{ marginTop: space.m }}>
        <NButton
          full
          testID="keep-save"
          disabled={busy || (!own && !text.trim())}
          label={own ? SHOWING_UP_COPY.bringBack(whenWords(pick.label, "on")) : SHOWING_UP_COPY.keepFor(whenWords(pick.label, "for"))}
          icon={({ color, size }) => <Bookmark color={color} size={size} strokeWidth={1.8} />}
          onPress={() => void save()}
        />
      </View>
      <NText v="fine" tone="quiet" style={{ marginTop: space.m }}>{own ? SHOWING_UP_COPY.bringFine : SHOWING_UP_COPY.keepFine(personName)}</NText>
    </View>
  );
}

/** The assist content for one idea: its grounds, then the ways to do it (PR #77 `assistSheet`). */
export function Assist({ idea, personName, today, onMessage, onCall, onSource, onKeep, onBringBack, onBack }: {
  idea: Idea;
  personName: string;
  today: string;
  onMessage: () => void;
  onCall: () => void;
  onSource: (noteId: string) => void;
  onKeep: (sentence: string, day: string, label: string) => Promise<void>;
  onBringBack: (itemId: string, day: string, label: string) => Promise<void>;
  /** Back to the list, when the assist opened from one. */
  onBack?: () => void;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  const [keeping, setKeeping] = useState(false);
  return (
    <View>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Back to the ideas" onPress={onBack} hitSlop={8} style={({ pressed }) => ({ alignSelf: "flex-start", minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.link : 1 })}>
          <NText v="strong14" tone="ink2">{"‹ Ideas"}</NText>
        </Pressable>
      ) : null}
      <CategoryTag label={CATEGORY_LABEL[idea.category]} tint={CATEGORY_TINT[idea.category]} />
      <NText v="sheetTitle" style={{ marginTop: space.m - 2, marginBottom: space.l - 2 }}>{idea.title}</NText>
      {idea.grounds.map((g) => (
        <View key={g.itemId ?? g.source} style={{ backgroundColor: n.card, borderRadius: 18, paddingVertical: space.l - 2, paddingHorizontal: space.l, marginBottom: space.s }}>
          <NText v={g.contacts ? "serif17" : "quote18"} style={{ fontSize: 17 }}>{g.contacts ? g.quote : `“${g.quote}”`}</NText>
          <NSource
            kind={g.contacts ? "contacts" : "note"}
            label={g.source}
            onPress={g.noteId ? () => onSource(g.noteId as string) : undefined}
            style={{ marginTop: space.s }}
          />
        </View>
      ))}
      <Lbl dot={null} style={{ marginTop: space.xl }}>{SHOWING_UP_COPY.ways}</Lbl>
      <View style={{ marginTop: space.s - 2 }}>
        {idea.ways.map((w) => {
          if (w === "message") return <WayRow key={w} icon={<MessageCircle size={20} color={p.ink} strokeWidth={1.8} />} title={SHOWING_UP_COPY.message(personName)} sub={SHOWING_UP_COPY.messageSub} onPress={onMessage} testID="way-message" />;
          if (w === "call") return <WayRow key={w} icon={<Phone size={20} color={p.ink} strokeWidth={1.8} />} title={SHOWING_UP_COPY.call(personName)} sub={SHOWING_UP_COPY.callSub} onPress={onCall} testID="way-call" />;
          if (w === "onday") return <WayRow key={w} icon={<Clock size={20} color={p.ink} strokeWidth={1.8} />} title={SHOWING_UP_COPY.onday} sub={SHOWING_UP_COPY.ondaySub(personName)} />;
          return (
            <WayRow key={w} icon={<Bookmark size={20} color={p.ink} strokeWidth={1.8} />} title={SHOWING_UP_COPY.keep} sub={SHOWING_UP_COPY.keepSub} onPress={() => setKeeping((k) => !k)} testID="way-keep">
              {keeping ? <KeepBox idea={idea} personName={personName} today={today} onKeep={onKeep} onBringBack={onBringBack} /> : null}
            </WayRow>
          );
        })}
      </View>
      <NText v="fine" tone="quiet" style={{ marginTop: space.l - 2 }}>{SHOWING_UP_COPY.footer}</NText>
    </View>
  );
}

/** A quiet confirmation with Undo (PR #77 `.toast`): what was kept and where; stays until dismissed. */
export function UndoToast({ message, onUndo, onDismiss, bottom = 150, inline = false }: { message: string; onUndo?: () => void; onDismiss: () => void; bottom?: number; inline?: boolean }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const reduce = useReduceMotion();
  return (
    <Animated.View
      entering={reduce ? FadeIn.duration(motion.reduced.duration) : FadeInDown.duration(motion.arrive.duration)}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        ...(inline ? { marginTop: space.m } : { position: "absolute" as const, left: space.l, right: space.l, bottom, zIndex: 50 }),
        backgroundColor: p.ink, borderRadius: 20, paddingVertical: space.m, paddingLeft: space.l, paddingRight: space.s,
        flexDirection: "row", alignItems: "center", gap: space.s, ...notebookShadow.poster,
      }}
    >
      <Check size={18} color={n.lime} strokeWidth={2} />
      <NText v="body15" color={p.onInk} style={{ flex: 1 }}>{message}</NText>
      {onUndo ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Undo" onPress={onUndo} hitSlop={6} style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", paddingHorizontal: space.s, opacity: pressed ? press.link : 1 })}>
          <NText v="strong15" color={n.lime}>Undo</NText>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={6} style={({ pressed }) => ({ minHeight: TOUCH, minWidth: TOUCH, alignItems: "center", justifyContent: "center", opacity: pressed ? press.link : 1 })}>
        <X size={18} color={p.onInk} strokeWidth={1.8} />
      </Pressable>
    </Animated.View>
  );
}


