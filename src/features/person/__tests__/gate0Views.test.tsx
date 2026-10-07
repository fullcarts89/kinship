// Gate 0 on the person's screens (founder round 4, CC-18): the name in
// titles is the whole chosen name ("What Kinship knows about Cutie Pie",
// never "…Cutie", I12).
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { PersonRecordView } from "@/features/person/PersonRecordView";
import { PortraitView } from "@/features/person/PortraitView";
import { shortName } from "../../../../supabase/functions/_shared/extraction/names";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;

function texts(el: React.ReactElement): string[] {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter(Boolean);
}

const cutie = { id: "w", display_name: "Cutie Pie", full_name: "Cutie Pie", nicknames: ["Wifey Liu", "Wifey"] };
const michelle = { id: "m", display_name: "Michelle Lee", full_name: "Michelle Lee", nicknames: [] };

describe("I12: titles use the whole chosen name", () => {
  it("What Kinship knows about Cutie Pie; a name from Contacts stays its first name", () => {
    const record = (p: typeof cutie) => texts(
      <PersonRecordView name={p.display_name} short={shortName(p)} label={null} lines={[]} onBack={noop} onRename={noop}
        onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />,
    );
    expect(record(cutie)).toContain("What Kinship knows about Cutie Pie");
    expect(record(michelle)).toContain("What Kinship knows about Michelle");
  });

  it("the portrait's link to What Kinship knows, and its empty line, say Cutie Pie", () => {
    const shown = texts(
      <PortraitView personId="w" name="Cutie Pie" short={shortName(cutie)} label={null} remembered={false} comingUp={[]} youSaid={[]} between={[]}
        total={1} lately={[{ itemId: "a", statement: "Cutie Pie has a new job", when: null, provenance: "You told Kinship · Oct 6", noteId: "n1" }]}
        onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop} />,
    );
    expect(shown).toContain("What Kinship knows about Cutie Pie →");
    expect(shown.some((t) => /about Cutie →|about Cutie$/u.test(t))).toBe(false);
  });
});

describe("I11: choosing several people, only those the memory names", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PersonPane } = require("@/features/tell/Pickers") as typeof import("@/features/tell/Pickers");
  const ppl = [
    { id: "susan", display_name: "Susan Oxnard", state: "active", birthday: null, birthday_source: null, version: 1 },
    { id: "michelle", display_name: "Michelle Lee", state: "active", birthday: null, birthday_source: null, version: 1 },
    { id: "ben", display_name: "Ben Oxnard", state: "active", birthday: null, birthday_source: null, version: 1 },
  ] as import("@/store/repositories").Person[];

  function pane(props: Partial<React.ComponentProps<typeof PersonPane>>) {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<PersonPane people={ppl} title="Who is this about?" current="susan" onPick={noop} onCancel={noop} {...props} />);
    });
    return r;
  }
  const labels = (r: TestRenderer.ReactTestRenderer) => r.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && typeof n.props.onPress === "function")
    .map((n) => String(n.props.accessibilityLabel));

  it("offers the people its words name, as choices, with Someone else and Done; never everyone in People", () => {
    const picked = jest.fn();
    const r = pane({ named: [ppl[0], ppl[1]], chosen: ["susan"], onPickMany: picked });
    const shown = labels(r);
    expect(shown).toEqual(expect.arrayContaining(["Susan Oxnard", "Michelle Lee", "Someone else", "Done"]));
    expect(shown).not.toContain("Ben Oxnard");
    act(() => r.root.findAll((n) => n.props.accessibilityLabel === "Michelle Lee" && typeof n.props.onPress === "function")[0].props.onPress());
    act(() => r.root.findAll((n) => n.props.accessibilityLabel === "Done" && typeof n.props.onPress === "function")[0].props.onPress());
    expect(picked).toHaveBeenCalledWith(["susan", "michelle"]);
  });

  it("without several named people it is the one-person list, as before", () => {
    const r = pane({});
    expect(labels(r)).toEqual(expect.arrayContaining(["Susan Oxnard", "Michelle Lee", "Ben Oxnard"]));
    expect(labels(r)).not.toContain("Done");
  });
});

describe("I3: a visible Edit, Remove from People inside it, Bring back in Settings", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NamePane } = require("@/features/tell/Pickers") as typeof import("@/features/tell/Pickers");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SettingsSheetView } = require("@/features/people/SettingsSheet") as typeof import("@/features/people/SettingsSheet");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { REMOVE_COPY, removeCopy } = require("@/features/person/PortraitView") as typeof import("@/features/person/PortraitView");
  const pressables = (r: TestRenderer.ReactTestRenderer) => r.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && typeof n.props.onPress === "function");

  it("the person's page shows Edit beside the name, which opens the name", () => {
    const onRename = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <PortraitView personId="k" name="Kaiya" short="Kaiya" label="daughter" remembered={false} comingUp={[]} youSaid={[]} between={[]} total={0}
          lately={[]} onRename={onRename} onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop} />,
      );
    });
    const edit = pressables(r).find((n) => n.props.accessibilityLabel === "Edit");
    expect(edit).toBeTruthy();
    act(() => edit!.props.onPress());
    expect(onRename).toHaveBeenCalled();
  });

  it("the name sheet offers Remove from People; the confirm says what stays and how to bring them back", () => {
    const onRemove = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<NamePane initial="Kaiya" onSave={noop} onCancel={noop} onRemove={onRemove} />);
    });
    const remove = pressables(r).find((n) => n.props.accessibilityLabel === "Remove from People");
    act(() => remove!.props.onPress());
    expect(onRemove).toHaveBeenCalled();
    expect(removeCopy("Kaiya")).toEqual({
      title: "Remove Kaiya from People?",
      body: "Kaiya won't appear in People or Today. Your notes stay, and you can bring Kaiya back from Settings.",
      cancel: "Cancel",
      remove: "Remove",
    });
    expect(REMOVE_COPY.action).toBe("Remove from People");
  });

  it("Settings lists who was removed, with Bring back, only when someone was", () => {
    const back = jest.fn();
    const render = (removed: { id: string; name: string }[]) => {
      let r!: TestRenderer.ReactTestRenderer;
      act(() => {
        r = TestRenderer.create(<SettingsSheetView visible understanding onUnderstanding={noop} onSignOut={noop} onDismiss={noop} removed={removed} onBringBack={back} />);
      });
      return r;
    };
    expect(texts(<SettingsSheetView visible understanding onUnderstanding={noop} onSignOut={noop} onDismiss={noop} removed={[]} onBringBack={back} />))
      .not.toContain("Removed from People");
    const r = render([{ id: "k", name: "Kaiya" }]);
    expect(r.root.findAllByType(Text).map((t) => [t.props.children].flat().join(""))).toContain("Removed from People");
    act(() => pressables(r).find((n) => n.props.accessibilityLabel === "Bring back Kaiya")!.props.onPress());
    expect(back).toHaveBeenCalledWith("k");
  });
});
