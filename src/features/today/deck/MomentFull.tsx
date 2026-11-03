// The expanded moment (PR #77 §3, `renderMoment`): the poster or a deck card opens into the whole moment,
// growing from the card's own rectangle (420 ms, ease-out; Reduce Motion: a 150 ms fade). The order is
// fixed: media · when · headline · the memory in the user's words and what they hoped · why now · the
// source · "You could mention" (never a line an idea below quotes) · the actions ("I did this" first for
// the user's own promise) · "Ideas for showing up", closed until asked · Open X's notebook · Not now.
// Built from Today's own detail (momentDetail.ts) and the person's ideas (ideas.ts); nothing is invented.
import React, { useEffect, useRef, useState } from "react";
import { Image, Modal, PanResponder, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight, MessageCircle, Phone, X } from "lucide-react-native";
import { notebook, press, space, TOUCH } from "@/design/tokens";
import type { MomentDetail } from "@/features/today/momentDetail";
import { Assist, IdeaList, IdeasToggle, SHOWING_UP_COPY, UndoToast } from "@/features/showingup/IdeasViews";
import type { Idea } from "@/features/showingup/ideas";
import { usePersonIdeas } from "@/hooks/useIdeas";
import { smallCount, track } from "@/platform/analytics";
import { Pressable } from "@/ui/Pressable";
import { Sheet, usePalette, useReduceMotion } from "@/ui";
import { sheetClosed, sheetOpened } from "@/ui/sheetStack";
import { flowers, initialOf, Lbl, NButton, NSource, NText, personLook, useNotebookPalette } from "@/ui/notebook";
import { DECK_COPY } from "./DeckParts";

export interface Rect { x: number; y: number; width: number; height: number }

export const MOMENT_COPY = {
  mention: "You could mention",
  notebook: (name: string) => `Open ${name}'s notebook`,
  close: "Close",
} as const;

const EXPAND_MS = 420;
const EASE = Easing.bezier(0.2, 0.9, 0.25, 1);

export function MomentFull({
  detail, from, photoUri, whenLabel, headline, onClose, onMessage, onCall, onPerson, onSource, onNotNow, onDid,
  onKeep, onBringBack, today,
}: {
  detail: MomentDetail | null;
  /** The card it grew from, in window coordinates; without it, a fade. */
  from: Rect | null;
  photoUri: string | null;
  /** "Yesterday · Sun, Nov 1". */
  whenLabel: string | null;
  /** The poster's headline (the moment's statement); a deck card's line otherwise. */
  headline: string;
  onClose: () => void;
  /** Message / Call: the moment's own hand-off; an idea's carries its SUA-1 kind. */
  onMessage: (gesture?: Idea["gesture"]) => void;
  onCall: (gesture?: Idea["gesture"]) => void;
  onPerson: () => void;
  onSource: (noteId: string) => void;
  /** Only the poster's moment can be put aside for the day. */
  onNotNow?: () => void;
  /** The user's own promise: "I did this". */
  onDid?: () => void;
  onKeep: (personId: string, sentence: string, day: string) => Promise<{ undo: () => Promise<void> }>;
  onBringBack: (itemId: string, day: string) => Promise<void>;
  today: string;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReduceMotion();
  const visible = !!detail;
  const [shown, setShown] = useState<MomentDetail | null>(detail);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const last = useRef(detail);
  // What it said when it opened stays while it leaves (Today may have moved on underneath).
  const words = useRef({ whenLabel, headline });
  if (detail) {
    last.current = detail;
    words.current = { whenLabel, headline };
  }
  const d = detail ?? shown ?? last.current;
  // Counted as a sheet from the moment it's up until it has fully left (sheetStack.ts): iOS drops a
  // modal presented while another is on screen, so a hand-off from here waits for this to go.
  const up = visible || !!shown;
  useEffect(() => {
    if (!up) return;
    sheetOpened();
    return () => sheetClosed();
  }, [up]);
  const when = detail ? whenLabel : words.current.whenLabel;
  const title = detail ? headline : words.current.headline;
  const { ideas } = usePersonIdeas(d?.personId ?? null, d ? { itemId: d.itemId, birthday: d.type === "birthday" || (d.type === "coming" && d.itemId === null) } : null);

  // The reveal: a window that grows from the card to the screen, the moment drawn in place behind it.
  const rect = from ?? { x: 0, y: 0, width: W, height: H };
  const t = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      setShown(detail);
      setIdeasOpen(false);
      setIdea(null);
      setToast(null);
      if (reduce || !from) {
        t.value = 1;
        fade.value = 0;
        fade.value = withTiming(1, { duration: reduce ? 150 : 240 });
      } else {
        fade.value = 1;
        t.value = 0;
        t.value = withTiming(1, { duration: EXPAND_MS, easing: EASE });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, detail?.key]);
  // Closed from outside (a hand-off, the moment gone from Today): leave the same way, without calling back.
  useEffect(() => {
    if (visible || !shown) return;
    const gone = () => setShown(null);
    if (reduce || !from) fade.value = withTiming(0, { duration: reduce ? 150 : 200 }, (ok) => ok && runOnJS(gone)());
    else t.value = withTiming(0, { duration: 320, easing: EASE }, (ok) => ok && runOnJS(gone)());
    // A test renderer or a paused animation never finishes: never leave a stale moment on screen.
    const timer = setTimeout(gone, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const close = () => {
    const done = () => {
      setShown(null);
      onClose();
    };
    if (reduce || !from) fade.value = withTiming(0, { duration: reduce ? 150 : 200 }, (ok) => ok && runOnJS(done)());
    else t.value = withTiming(0, { duration: 320, easing: EASE }, (ok) => ok && runOnJS(done)());
  };
  const frame = useAnimatedStyle(() => ({
    opacity: fade.value,
    top: rect.y * (1 - t.value),
    left: rect.x * (1 - t.value),
    width: rect.width + (W - rect.width) * t.value,
    height: rect.height + (H - rect.height) * t.value,
    borderRadius: notebook.poster.radius * (1 - t.value),
  }));
  const inner = useAnimatedStyle(() => ({
    top: -rect.y * (1 - t.value),
    left: -rect.x * (1 - t.value),
  }));
  // Swipe down from the top half closes it, as the spec asks; the content still scrolls.
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 2,
    onPanResponderRelease: (_e, g) => {
      if (g.dy > 110) close();
    },
  })).current;

  useEffect(() => {
    if (ideasOpen && d) track("ideas_opened", { surface: "moment", ideas_n: smallCount(ideas.length) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideasOpen]);

  if (!d) return null;
  const look = personLook(d.personId);
  const photo = photoUri ?? null;
  const groundLines = new Set(ideas.flatMap((i) => i.grounds.map((g) => g.line).filter(Boolean)));
  const mentions = d.mention.filter((m) => !groundLines.has(m) && m !== d.line).slice(0, 2);
  const sourceKind = d.provenance === "From Contacts" || (!d.noteId && d.type === "birthday") ? "contacts" : "note";
  const promise = !!onDid;
  return (
    <Modal visible={visible || !!shown} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[{ position: "absolute", overflow: "hidden", backgroundColor: p.paper }, frame]}>
        <Animated.View style={[{ position: "absolute", width: W, height: H }, inner]}>
          <ScrollView style={{ flex: 1, backgroundColor: p.paper }} contentContainerStyle={{ paddingBottom: insets.bottom + space.x4 }} testID="moment-full">
            <View {...pan.panHandlers} style={{ height: notebook.momentMedia.photo, backgroundColor: photo ? "#0F2A1D" : look.color, overflow: "hidden" }}>
              {photo ? (
                <Image source={{ uri: photo }} resizeMode="cover" style={{ width: W, height: notebook.momentMedia.photo }} accessibilityLabel={`Photo of ${d.personName}`} />
              ) : (
                <>
                  <NText v="poster" allowFontScaling={false} color="rgba(15,42,29,0.1)" style={{ position: "absolute", left: 18, bottom: 30, fontSize: 200, lineHeight: 160 }}>{initialOf(d.personName)}</NText>
                  <Image source={flowers[look.flower]} resizeMode="contain" style={{ position: "absolute", width: 290, height: 290, right: -40, top: 40, transform: [{ rotate: "-8deg" }] }} />
                </>
              )}
            </View>
            <View style={{ marginTop: -notebook.momentMedia.overlap, backgroundColor: p.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: space.xxl, paddingHorizontal: space.xl + 4 }}>
              {when ? <NText v="cap" tone="ink2">{when}</NText> : null}
              <NText v="moment" style={{ marginTop: space.m - 2, marginBottom: space.l - 2 }}>{title}</NText>
              {d.line && d.line !== title ? <NText v="serif20" style={{ marginBottom: space.xs + 2 }}>{d.line}</NText> : null}
              {d.hope ? <NText v="quote19" tone="ink2" style={{ marginBottom: space.m - 2 }}>{d.hope}</NText> : null}
              <NText v="body15" tone="ink2" style={{ marginBottom: space.m }}>{d.why}</NText>
              {d.provenance ? (
                <NSource chevron kind={sourceKind} label={d.provenance} onPress={d.noteId ? () => onSource(d.noteId as string) : undefined} style={{ marginTop: space.xs + 2, marginBottom: space.xs }} />
              ) : null}

              {mentions.length ? (
                <View>
                  <Lbl dot={p.lavender} style={{ marginTop: space.xxl - 2, marginBottom: space.m - 2 }}>{MOMENT_COPY.mention}</Lbl>
                  {mentions.map((m) => (
                    <View key={m} style={{ borderLeftWidth: 2.5, borderLeftColor: p.lavender, paddingLeft: space.l - 2, paddingVertical: 2, marginBottom: space.m }}>
                      <NText v="serif18">{m}</NText>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: space.m - 2, marginTop: space.xxl - 4 }}>
                {promise ? (
                  <NButton flex={1} variant="lime" label={DECK_COPY.did} onPress={() => onDid?.()} icon={({ color, size }) => <Check color={color} size={size} strokeWidth={2} />} testID="moment-did" />
                ) : null}
                <NButton
                  flex={promise ? undefined : 1}
                  variant={promise ? "ghost" : "ink"}
                  label={promise ? "Message" : d.heading.replace(/^Reach /u, "Message ")}
                  onPress={() => onMessage()}
                  testID="moment-primary"
                  icon={({ color, size }) => <MessageCircle color={color} size={size} strokeWidth={1.8} />}
                />
                <NButton variant="ghost" accessibilityLabel={`Call ${d.personName}`} onPress={() => onCall()} testID="moment-call" icon={({ color, size }) => <Phone color={color} size={size} strokeWidth={1.8} />} />
              </View>

              {ideas.length ? (
                <View style={{ marginTop: space.l + 2 }}>
                  <IdeasToggle name={d.personName} open={ideasOpen} onPress={() => setIdeasOpen((o) => !o)} />
                  {ideasOpen ? <IdeaList ideas={ideas} onIdea={(i) => {
                    track("idea_opened", { category: i.category, surface: "moment" });
                    setIdea(i);
                  }} /> : null}
                </View>
              ) : null}
              {toast ? <UndoToast inline message={toast.message} onUndo={toast.undo} onDismiss={() => setToast(null)} /> : null}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.l + 2 }}>
                <Pressable accessibilityRole="link" onPress={onPerson} testID="moment-person" style={({ pressed }) => ({ minHeight: TOUCH, flexDirection: "row", alignItems: "center", gap: space.xs + 2, opacity: pressed ? press.link : 1, flexShrink: 1 })}>
                  <NText v="strong15" tone="ink2" style={{ fontSize: 15 }}>{MOMENT_COPY.notebook(d.personName)}</NText>
                  <ChevronRight size={18} color={n.ink2} strokeWidth={1.8} />
                </Pressable>
                {onNotNow ? (
                  <Pressable accessibilityRole="button" onPress={() => {
                    onNotNow();
                    close();
                  }} testID="moment-notnow" style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.link : 1 })}>
                    <NText v="strong15" tone="ink2">{DECK_COPY.notNow}</NText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>
          <View style={{ position: "absolute", top: insets.top + space.s, left: space.l }}>
            <Pressable accessibilityRole="button" accessibilityLabel={MOMENT_COPY.close} onPress={close} hitSlop={4} testID="moment-close" style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}>
              <View style={{ width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, backgroundColor: n.card, alignItems: "center", justifyContent: "center", shadowColor: "#0B2A1D", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
                <X size={22} color={p.ink} strokeWidth={1.8} />
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
      <Sheet visible={!!idea} onDismiss={() => setIdea(null)} label={idea?.title ?? SHOWING_UP_COPY.toggle}>
        {idea ? (
          <Assist
            idea={idea}
            personName={d.personName}
            today={today}
            onMessage={() => {
              const g = idea.gesture;
              setIdea(null);
              onMessage(g);
            }}
            onCall={() => {
              const g = idea.gesture;
              setIdea(null);
              onCall(g);
            }}
            onSource={(noteId) => {
              setIdea(null);
              onSource(noteId);
            }}
            onKeep={async (sentence, day, label) => {
              const kept = await onKeep(d.personId, sentence, day);
              setIdea(null);
              setToast({ message: SHOWING_UP_COPY.kept(label === "Tomorrow" ? "tomorrow" : label, d.personName), undo: () => void kept.undo().finally(() => setToast(null)) });
            }}
            onBringBack={async (itemId, day, label) => {
              await onBringBack(itemId, day);
              setIdea(null);
              setToast({ message: SHOWING_UP_COPY.broughtBack(label === "Tomorrow" ? "tomorrow" : `on ${label}`) });
            }}
          />
        ) : null}
      </Sheet>
    </Modal>
  );
}
