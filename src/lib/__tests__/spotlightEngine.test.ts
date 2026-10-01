import { selectSpotlightMemory } from "@/lib/spotlightEngine";
import type { Memory } from "@/types/database";

function memory(id: string, occurredAt: string, extra: Partial<Memory> = {}): Memory {
  return {
    id,
    user_id: "user-1",
    person_id: "person-1",
    content: "A moment",
    emotion: null,
    photo_url: null,
    occurred_at: occurredAt,
    created_at: occurredAt,
    ...extra,
  } as Memory;
}

const NOW = new Date(2026, 9, 1, 12); // 1 Oct 2026, local noon

describe("selectSpotlightMemory", () => {
  it("returns null when nothing is at least 7 days old", () => {
    const recent = memory("m1", new Date(2026, 8, 28).toISOString());
    expect(selectSpotlightMemory([recent], NOW)).toBeNull();
  });

  it("prefers an exact anniversary and says so", () => {
    const anniversary = memory("a", new Date(2025, 9, 1, 12).toISOString());
    const other = memory("b", new Date(2025, 5, 15).toISOString(), {
      photo_url: "file:///photo.jpg",
    });
    const pick = selectSpotlightMemory([other, anniversary], NOW);
    expect(pick?.memory.id).toBe("a");
    expect(pick?.reason).toBe("One year ago today");
  });

  it("uses a multi-year reason for older anniversaries", () => {
    const old = memory("old", new Date(2023, 9, 1, 12).toISOString());
    expect(selectSpotlightMemory([old], NOW)?.reason).toBe("3 years ago today");
  });

  it("is deterministic for the same day", () => {
    const memories = ["x", "y", "z"].map((id) =>
      memory(id, new Date(2026, 6, 1).toISOString())
    );
    const first = selectSpotlightMemory(memories, NOW)?.memory.id;
    const second = selectSpotlightMemory([...memories].reverse(), NOW)?.memory.id;
    expect(second).toBe(first);
  });
});
