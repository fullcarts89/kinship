// Good news, said outright in the user's own line (stabilization Gate G): "promoted", "got the job",
// "had the baby"… Shared by Today's good-news Moment (todayModel.ts) and the SUA-1 gesture line
// (suggestions.ts). Deterministic word lists, no model.

/** Words that say good news outright. */
export const GOOD_NEWS = /\b(?:was |got |been |is |has been )?promoted\b|\bpromotion\b|\bgot (?:the|a|an|her|his|their)\s+(?:\S+\s+){0,2}?(?:job|offer|role|position|place)\b|\bgot (?:engaged|married|in|into|accepted|hired)\b|\b(?:was|were) (?:accepted|hired)\b|\bgraduated\b|\bhad (?:a|the|her|his|their) baby\b|\bis engaged\b|\bpassed (?:the|her|his|their)\b|\bbought (?:a|their|his|her) (?:house|home|place)\b|\bclosed on\b|\bfinished (?:the|her|his|their) (?:marathon|race|degree|thesis)\b/iu;
/** A negation in the words: never good news. */
export const NOT_NEWS = /\b(not|didn['’]?t|did not|never|no longer|wasn['’]?t|isn['’]?t)\b/iu;
