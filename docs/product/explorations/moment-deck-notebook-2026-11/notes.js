/* Contextual design notes beside the phone: what the current screen is for, and which rule it keeps. */
const UI_NOTES = {
  today: {
    t: 'Today · moments, not tasks',
    p: 'One poster when a real reason clears the existing threshold; the rest of the week as a short, finite deck that ends with “That’s today.” A moment is valuable even if you do nothing: Not now is always one tap.',
    keep: ['Eligibility, scores, the one-moment cap and the quiet-line rules are today-eligibility.md, unchanged.', 'No counts, streaks, overdue or “it’s been a while”.', 'The return check sits above the moment, as built.'],
    new: ['The hero is a full-bleed poster: the person’s photo, or type, color and their flower when there is no photo.', 'Quiet lines become a swipeable deck with clearly lower weight.', 'Hard-time reasons get a quieter poster (Wednesday).'],
  },
  moment: {
    t: 'Moment · the door to showing up',
    p: 'The card expands in place. Top to bottom: why now, your words with their source, things you could mention, the primary action, and an explicit “Ideas for showing up” that stays closed until you ask.',
    keep: ['The I1 Moment detail: grounded line, why now, timing, Source, Message / Call, View person.', 'Hand-off opens the channel; it is never contact by itself (T12).'],
    new: ['Ideas are grounded: each quotes the memory it comes from, with a source.', 'Ideas never appear on the Today card or in a push (FD-8 and the founder’s 19 Oct point 2).'],
  },
  people: {
    t: 'People · a light index',
    p: 'Equal portrait tiles, A–Z, plus a “Coming up for them” band ordered only by date. One search field finds a name or anything you told Kinship. No groups to maintain.',
    keep: ['Nothing ordered by closeness, recency of contact or importance.', 'Photo-optional: type, color and flower carry identity; flowers never grow.'],
    new: ['Retires T4’s search-first A–Z list. That needs the founder’s override (PR #76).', 'Memory search is Ask v1’s word match, presented as search, not chat.'],
  },
  person: {
    t: 'Person · a living notebook',
    p: 'Three lenses on one person instead of stacked sections that repeat each other. Now is the Portrait (what is live), Pages is your own words over time interleaved with what you did, Knows is the organized reference.',
    keep: ['Portrait rules, What Kinship knows sections, Between you trail, provenance, Edit and Not this.', 'Empty pages invite a first Tell; nothing is invented to fill them.'],
    new: ['Pages: the notebook. Your notes, exact, with what Kinship kept highlighted; tap a highlight to correct it.', 'Between you and kept intentions show the showing-up history on the person.'],
  },
  source: {
    t: 'Source · your words, exactly',
    p: 'Every line points here. Highlights are colored by person, so a note about three people stays legible.',
    keep: ['Source view (NoteView.tsx), exact words, no ids or scores.'],
    new: ['Ruled-paper treatment; per-person highlight color.'],
  },
  tell: {
    t: 'Tell · write it the way you’d say it',
    p: 'A page, not a form or a chat. Long, messy, several people: fine. After Keep, understanding sweeps under your own words in each person’s color before the review appears.',
    keep: ['Same Tell pipeline; consent, long notes read in passages, nothing capped silently.'],
    new: ['The understanding animation shows what was read, where, before any list.'],
  },
  review: {
    t: 'Review · your words beside what was understood',
    p: 'Your words stay on top, each understood phrase underlined in its person’s color; tap one to jump to its line, tap a line to flash its words. Questions come first, only when they matter. Lines are readable sentences; tap a date or the sentence to correct it in place.',
    keep: ['Clear lines save with Undo; sensitive and two-candidate readings wait for you.', 'Told again → “Replaces …” with Keep both; already known → nothing added twice.', 'Removing a line never deletes your note.'],
    new: ['Phrase ↔ line mapping; grouped by person; inline sentence edit with your original words beside it.'],
  },
  sheet: {
    t: 'Ideas · assistance, not automation',
    p: 'One idea, the words it came from, and ways to do it. Kinship opens doors; you act. “Keep it in mind” saves an intention in your own words, as a Tell, so the truth model is unchanged.',
    keep: ['D9: never sends; openers only on request. CC-28: no commerce, nothing bought or booked.'],
    new: ['Keep it in mind (an intention) and Help me start are proposals; Find it is a future plain hand-off.'],
  },
  handoff: {
    t: 'Hand-off · Kinship steps aside',
    p: 'Kinship opened the app. It can’t see what you write and records nothing until you say so on the way back.',
    keep: ['T12: a hand-off alone never counts. The return check is the only evidence of contact.'],
    new: [],
  },
};
function renderNotes() {
  const el = document.getElementById('notes'); if (!el) return;
  let k = cur().s;
  if (S.handoff) k = 'handoff'; else if (S.rv) k = 'review'; else if (S.tell) k = 'tell'; else if (S.sheet && S.sheet.k !== 'line') k = 'sheet';
  const n = UI_NOTES[k]; if (!n) { el.innerHTML = ''; return; }
  el.innerHTML = `<h4 style="margin-top:0">On screen</h4><h2>${n.t}</h2><p>${n.p}</p><h4>Kept from the contract</h4><ul>${n.keep.map((x) => `<li>${x}</li>`).join('')}</ul>${n.new.length ? `<h4>What’s new here</h4><ul>${n.new.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}<h4>Three pillars</h4><p style="font-size:13.5px"><b>Notebook</b> remembers · <b>Moment Deck</b> recognizes · <b>Showing up</b> acts and follows through. Each screen above serves one of them and hands off to the next.</p>`;
}
