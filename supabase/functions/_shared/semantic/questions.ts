// The residence question's words (Phase 4B B3; case E; founder CC-19,
// CC-24). One place for them, shared by the app's review (reviewModel.ts)
// and the semantic corpus. Plain TypeScript, no imports.
//
// Asked only when a new residence may not fit the one Kinship holds and a
// wrong pick would show something false; never "Which Alameda?". Both places
// are the user's own words. The person is named, never a guessed pronoun
// (CC-20): the approved "She moved" reads "Susan moved".

export interface ResidenceQuestion {
  prompt: string;
  /** Keeps the line asked about; the new words are kept beside it. */
  stay: string;
  /** Closes the line asked about, as a change (history-eligible). */
  moved: string;
}

/** "Is Susan still in Alameda?" · Still there · Susan moved. */
export function residenceQuestion(name: string, words: string): ResidenceQuestion {
  return { prompt: `Is ${name} still in ${words}?`, stay: "Still there", moved: `${name} moved` };
}
