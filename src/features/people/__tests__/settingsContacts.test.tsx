// Settings › Contacts says what Kinship can see and offers the one thing to
// do about it (founder native pass F8: it was a sentence with nothing to do).
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { CONTACTS_COPY, SettingsSheetView } from "../SettingsSheet";
import type { ContactsAccess } from "@/platform/deviceContacts";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

function shown(contacts: ContactsAccess) {
  const handlers = { onAddFromContacts: jest.fn(), onAllowContacts: jest.fn(), onShareMore: jest.fn(), onOpenSettings: jest.fn() };
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<SettingsSheetView visible understanding onUnderstanding={jest.fn()} onSignOut={jest.fn()} onDismiss={jest.fn()}
      contacts={contacts} {...handlers} />);
  });
  const strings = tree.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);
  const press = (label: string) => act(() => tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")[0].props.onPress());
  return { strings, press, handlers };
}

it("allowed: says so, and adds people from contacts", () => {
  const s = shown({ state: "granted", limited: false });
  expect(s.strings).toContain(CONTACTS_COPY.granted);
  s.press(CONTACTS_COPY.add);
  expect(s.handlers.onAddFromContacts).toHaveBeenCalled();
});

it("some shared: can share more", () => {
  const s = shown({ state: "granted", limited: true });
  expect(s.strings).toContain(CONTACTS_COPY.limited);
  s.press(CONTACTS_COPY.more);
  expect(s.handlers.onShareMore).toHaveBeenCalled();
});

it("refused: the way to change it is iOS Settings", () => {
  const s = shown({ state: "denied", canAskAgain: false });
  expect(s.strings).toContain(CONTACTS_COPY.denied);
  s.press(CONTACTS_COPY.settings);
  expect(s.handlers.onOpenSettings).toHaveBeenCalled();
});

it("never asked: asks", () => {
  const s = shown({ state: "undetermined" });
  s.press(CONTACTS_COPY.allow);
  expect(s.handlers.onAllowContacts).toHaveBeenCalled();
});
