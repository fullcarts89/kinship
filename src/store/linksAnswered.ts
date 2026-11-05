// What the user has already said about "Is this …?" on a person's page, on this phone (founder G20/G34).
import { getMeta, setMeta } from "./schema";
import type { SqlDb } from "./sql";

const LINKS_ANSWERED = "person_links_answered";

/** The user said "Priya's friend Ana" isn't this person: her page doesn't ask about that relative. */
export function apartKey(ownerId: string, name: string, personId: string): string {
  return `apart:${ownerId}:${name.trim().toLowerCase()}:${personId}`;
}

export async function linksAnswered(db: SqlDb): Promise<Set<string>> {
  return new Set<string>(JSON.parse((await getMeta(db, LINKS_ANSWERED)) ?? "[]") as string[]);
}

export async function rememberLinks(db: SqlDb, keys: string[]): Promise<void> {
  await setMeta(db, LINKS_ANSWERED, JSON.stringify([...new Set([...(await linksAnswered(db)), ...keys])]));
}
