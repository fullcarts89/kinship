// Merge two People who are one person (PER-05; FD-30e), from the person's
// name sheet. Two panes: who else is them (a short list of people who share
// a name, never ranked or scored; "Someone else" opens everyone), then
// exactly what moves, before the user says Merge. The person whose page this
// is keeps their name; the other is folded into them and leaves People, with
// Undo for 30 days. Logic only; WS-2 restyles.
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { size, space } from "@/design/tokens";
import { MERGE_COPY, type MergePreview, sayName } from "@/store/peopleMerge";
import type { Person } from "@/store/repositories";
import { Body, Label, Line, Pill, Row, Sheet, Small, Sprig, Title } from "@/ui";

export function MergeSheet(props: {
  visible: boolean;
  /** The person who stays (this page's). */
  person: Person | null;
  candidates: Person[];
  everyone: Person[];
  onDismiss: () => void;
  preview: (sourceId: string) => Promise<MergePreview>;
  onMerge: (sourceId: string) => Promise<void>;
}) {
  const [source, setSource] = useState<Person | null>(null);
  const [all, setAll] = useState(false);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (!props.visible) {
      setSource(null);
      setAll(false);
      setPreview(null);
      setBusy(false);
      setProblem(null);
    }
  }, [props.visible]);
  useEffect(() => {
    if (!source) return;
    let live = true;
    setPreview(null);
    props.preview(source.id).then((p) => live && setPreview(p), () => live && setProblem("That couldn't be read. Try again in a moment."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id]);
  const me = props.person;
  if (!me) return null;
  const keep = sayName(me);
  const list = all ? props.everyone : props.candidates;
  const merge = async () => {
    if (!source || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await props.onMerge(source.id);
      props.onDismiss();
    } catch (e) {
      setProblem(e instanceof Error && e.message ? e.message : "That couldn't be done. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      visible={props.visible}
      onDismiss={props.onDismiss}
      label={MERGE_COPY.title(keep)}
      footer={source ? (
        <View style={{ flexDirection: "row", gap: space.s }}>
          <Pill variant="quiet" label={MERGE_COPY.cancel} onPress={() => setSource(null)} />
          <Pill variant="primary" label={MERGE_COPY.confirm} accessibilityLabel={`${MERGE_COPY.confirm} ${sayName(source)} into ${keep}`} busy={busy} disabled={!preview} onPress={() => void merge()} />
        </View>
      ) : undefined}
    >
      {!source ? (
        <View>
          <Title>{MERGE_COPY.pickTitle(keep)}</Title>
          <Small style={{ marginTop: space.s }}>{"Two entries for one person become one page. Everything either knows is kept."}</Small>
          <View style={{ marginTop: space.l }}>
            {list.map((p, i) => (
              <Row key={p.id} first={i === 0} leading={<Sprig personId={p.id} width={size.sprig.row} />} title={p.display_name} onPress={() => setSource(p)} />
            ))}
          </View>
          {!list.length ? <Body style={{ marginTop: space.m }}>{MERGE_COPY.pickNone(keep)}</Body> : null}
          {!all && props.everyone.length > props.candidates.length ? (
            <View style={{ alignItems: "flex-start", marginTop: space.l }}>
              <Pill variant="quiet" size="small" label={MERGE_COPY.pickOthers} onPress={() => setAll(true)} />
            </View>
          ) : null}
        </View>
      ) : (
        <View>
          <Title>{MERGE_COPY.previewTitle(sayName(source), keep)}</Title>
          <Body style={{ marginTop: space.s }}>{MERGE_COPY.previewLead(sayName(source), keep)}</Body>
          <Small style={{ marginTop: space.xs }}>{MERGE_COPY.keepOther(sayName(source))}</Small>
          {preview ? <PreviewLines keep={keep} preview={preview} /> : <Small style={{ marginTop: space.l }}>{"Reading what moves…"}</Small>}
          {problem ? <Body tone="ink" style={{ marginTop: space.l }}>{problem}</Body> : null}
        </View>
      )}
    </Sheet>
  );
}

function Section({ title, lines }: { title: string; lines: string[] }) {
  if (!lines.length) return null;
  return (
    <View style={{ marginTop: space.l }}>
      <Label>{title}</Label>
      {lines.map((l, i) => <Line key={`${i}:${l}`} style={{ marginTop: space.xs }}>{l}</Line>)}
    </View>
  );
}

function PreviewLines({ keep, preview }: { keep: string; preview: MergePreview }) {
  const extras = [
    preview.birthday ? MERGE_COPY.birthday(keep, preview.birthday) : null,
    preview.contactLink ? MERGE_COPY.contactLink(keep) : null,
    preview.alsoKnownAs.length ? MERGE_COPY.alsoKnownAs(keep, preview.alsoKnownAs.join(", ")) : null,
  ].filter((x): x is string => !!x);
  const nothing = !preview.memories.length && !preview.shared.length && !preview.related.length && !preview.conversations.length;
  return (
    <View>
      {nothing ? <Body style={{ marginTop: space.l }}>{MERGE_COPY.nothing}</Body> : null}
      <Section title={MERGE_COPY.memories} lines={preview.memories} />
      <Section title={MERGE_COPY.shared} lines={preview.shared} />
      <Section title={MERGE_COPY.related} lines={preview.related} />
      <Section title={MERGE_COPY.conversations} lines={preview.conversations} />
      {extras.map((e) => <Small key={e} style={{ marginTop: space.m }}>{e}</Small>)}
    </View>
  );
}
