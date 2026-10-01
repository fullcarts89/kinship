// P0-08: Home suggestions read the calendar only if the user already allowed
// it; they never raise the system permission dialog.
import { getRecentCalendarMatches } from "@/lib/calendarEngine";
import type { Person } from "@/types/database";

const mockCalendar = {
  getCalendarPermissionsAsync: jest.fn(),
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(() => Promise.resolve([{ id: "c1" }])),
  getEventsAsync: jest.fn(() => Promise.resolve([])),
  EntityTypes: { EVENT: "event" },
};
jest.mock("expo-calendar", () => mockCalendar, { virtual: true });

const people = [{ id: "p1", name: "Maya Chen" }] as Person[];

beforeEach(() => jest.clearAllMocks());

it.each(["undetermined", "denied"])("permission %s → no prompt, no matches", async (status) => {
  mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ status });
  await expect(getRecentCalendarMatches(people)).resolves.toEqual([]);
  expect(mockCalendar.requestCalendarPermissionsAsync).not.toHaveBeenCalled();
  expect(mockCalendar.getCalendarsAsync).not.toHaveBeenCalled();
});

it("already granted (via Garden Walk setup) → reads events, still no prompt", async () => {
  mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  await getRecentCalendarMatches(people);
  expect(mockCalendar.getCalendarsAsync).toHaveBeenCalled();
  expect(mockCalendar.requestCalendarPermissionsAsync).not.toHaveBeenCalled();
});

it("Home and suggestions never request calendar permission themselves", () => {
  const fs = jest.requireActual<typeof import("fs")>("fs");
  for (const file of ["app/(tabs)/index.tsx", "src/hooks/useSuggestions.ts"]) {
    const src = fs.readFileSync(`${__dirname}/../../../${file}`, "utf8");
    expect(src).not.toMatch(/requestCalendarPermission/);
  }
});
