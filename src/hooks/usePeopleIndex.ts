// The read side of People as an index (notebook; PR #77 spec §9): everyone in People as tiles, and
// "Coming up for them" from their memory lines and sourced birthdays. Re-reads whenever the user's
// store changes, as every 2.0 hook does (useV2.ts). The rules are peopleIndexModel.ts's.
import { useV2Session } from "@/providers/V2SessionProvider";
import { buildTiles, comingUpForThem, nameWordsOf, type BandEntry, type TileData } from "@/features/people/notebook/peopleIndexModel";
import { type MemoryItem, type Person, repositoriesFor } from "@/store/repositories";
import type { UserStore } from "@/store/userStore";
import { isInPeople } from "@/store/peopleStates";
import { useStoreQuery } from "./useStoreQuery";

export interface PeopleIndex {
  /** Read at least once (an account still being read is never "no one here yet"). */
  loaded: boolean;
  /** Everyone in People, held people too (D13: no marker). */
  people: Person[];
  tiles: TileData[];
  band: BandEntry[];
  /** Every word of everyone's names, so a search never marks a name as a found word. */
  names: Set<string>;
  /** The ISO day the band was read for. */
  today: string;
}

const EMPTY: PeopleIndex = { loaded: false, people: [], tiles: [], band: [], names: new Set(), today: "" };

/** Today in the user's own calendar, as an ISO day. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The index for this store at this moment (the hook and tests share it). */
export async function peopleIndexFor(store: UserStore, now: Date): Promise<PeopleIndex> {
  const people = (await repositoriesFor(store).people.list()).filter((p) => isInPeople(p));
  const items = (await store.list("memory_items")) as MemoryItem[];
  const today = isoDay(now);
  return {
    loaded: true,
    people,
    tiles: buildTiles(people),
    band: comingUpForThem({ people, items, today }),
    names: nameWordsOf(people),
    today,
  };
}

export function usePeopleIndex(): PeopleIndex {
  const { store } = useV2Session();
  const q = useStoreQuery(store, () => (store ? peopleIndexFor(store, new Date()) : Promise.resolve(EMPTY)));
  return q.data ?? EMPTY;
}
