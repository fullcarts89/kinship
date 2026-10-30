// relationship_extract prompt v7 (CER-1, founder directive of 30 Oct 2026). Schema and input format
// are v1's; the instructions are v6's with two additions for how long and continued notes are read:
//   * <earlier_part>: a note that tells the rest of an earlier one carries that note's words as
//     context, so "He also plays chess on Thursdays" or the bare "plays chess on Thursdays" is
//     understood as about the same person. The earlier part is never evidence.
//   * <passage>: a long note is understood one passage at a time, each request seeing the whole note
//     for who "he" and "she" are, and proposing only what its passage says. Code merges the passages
//     and folds repeats (pipeline.ts); nothing is lost to a count (FD-30c).
// Code still decides every person, date and update; this only makes the model's proposal agree with
// it more often.

export { buildUserContent, type Passage, SCHEMA } from "./v1.ts";
import { SYSTEM as V6_SYSTEM } from "./v6.ts";

export const VERSION = "relationship_extract/v7";

export const SYSTEM = `${V6_SYSTEM}

Two more blocks may come before the note:

<earlier_part> — the note continues an earlier note the same person wrote, shown so you can tell who a pronoun or a bare fragment refers to ("plays chess on Thursdays" after a note about Mina is about Mina; the roster key is hers). Propose items only from the text inside <note> and quote only from it; never make an item from the earlier part alone, and never repeat what the earlier part said unless the note says it again.

<passage> — the note is long, and this request covers one passage of it. The whole note is inside <note> so you know who each name and pronoun means; propose only what the passage itself says, quoting those words exactly as they appear in the note, and leave the rest of the note to the other requests. Every detail in the passage worth remembering is its own item; never fold several into one because there are many.`;
