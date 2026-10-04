// The hand-off (plan §15; E14): each channel opens the user's own app at the
// person; Kinship never pre-fills or sends anything.
import { channelsFor, dialable, urlFor } from "@/platform/handoff";

jest.mock("react-native", () => ({ Platform: { OS: "ios" }, Linking: { openURL: jest.fn(), canOpenURL: jest.fn() } }));

it("builds a plain URL per channel, with no body to send", () => {
  expect(urlFor("text", "+1 (312) 555-0199")).toBe("sms:+13125550199");
  expect(urlFor("call", "312-555-0199")).toBe("tel:3125550199");
  expect(urlFor("facetime", "+1 312 555 0199")).toBe("facetime:+13125550199");
  expect(urlFor("whatsapp", "+1 312 555 0199")).toBe("whatsapp://send?phone=13125550199");
  expect(urlFor("email", "ben@example.com")).toBe("mailto:ben%40example.com");
  for (const c of ["text", "call", "facetime", "whatsapp"] as const) {
    expect(urlFor(c, "+13125550199")).not.toMatch(/body|text=/);
  }
});

it("refuses what it can't open rather than guessing", () => {
  expect(urlFor("whatsapp", "312 555 0199")).toBeNull(); // WhatsApp needs the international number
  expect(urlFor("text", "12")).toBeNull();
  expect(urlFor("email", "not an address")).toBeNull();
  expect(dialable(" +44 20 7946 0958 ")).toBe("+442079460958");
});

it("offers only the channels this phone can use for them", () => {
  expect(channelsFor({ contactId: "c", phones: ["+13125550199"], emails: [] })).toEqual(["text", "call", "facetime", "whatsapp"]);
  expect(channelsFor({ contactId: "c", phones: ["3125550199"], emails: ["b@x.co"] })).toEqual(["text", "call", "facetime", "email"]);
  expect(channelsFor({ contactId: null, phones: [], emails: [] })).toEqual([]);
});
