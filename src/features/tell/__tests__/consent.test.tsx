// D2/D3: the one consent understanding needs says, word for word, that what
// the user records may be processed by Kinship's AI provider; declining
// keeps notes as written; the Settings switch repeats it.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { SettingsSheetView } from "@/features/people/SettingsSheet";
import { CONSENT_COPY, ConsentSheetView } from "@/features/tell/ConsentSheet";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => { throw new Error("not used"); } }));

const D2 = "Information you choose to record about people in your life may be processed by Kinship's AI provider in order to understand and organize it.";

function texts(el: React.ReactElement): string[] {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  return tree.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);
}

it("the consent sheet carries the approved disclosure and the interim provider line", () => {
  const t = texts(<ConsentSheetView visible busy={false} onAllow={() => undefined} onDecline={() => undefined} />);
  expect(CONSENT_COPY.body).toBe(D2);
  expect(t).toEqual(expect.arrayContaining([D2, "Sent to Anthropic to understand it; not used to train models.", "Allow", "Keep notes as written"]));
  // Never claims the provider keeps nothing (D2: not until zero-retention terms apply).
  for (const s of t) expect(s).not.toMatch(/retain|kept nothing|never stored|deleted immediately/i);
});

it("Settings repeats it beside the switch", () => {
  const t = texts(<SettingsSheetView visible understanding onUnderstanding={() => undefined} onSignOut={() => undefined} onDismiss={() => undefined} />);
  expect(t).toEqual(expect.arrayContaining([D2, "Understanding what you tell Kinship", "Sign out"]));
});
