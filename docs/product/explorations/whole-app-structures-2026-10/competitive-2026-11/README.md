# Competitive intelligence and differentiation (1 Nov 2026)

**Status: RESEARCH AND STRATEGY ONLY · UNAPPROVED · founder decision gate.**
- No code, schema, migration, flag, coverage row or decision register changed.
- Nothing here authorises implementation.
- Readiness of the five structures is unchanged: NOT READY.

This is the second research layer on PR #76. The first layer is preserved unchanged in [`../README.md`](../README.md), [`../screens/`](../screens/) and [`../canvas/`](../canvas/): the five whole-app structures, about 85 design references and my original recommendation. This layer asks a different question: **what can Kinship deliver that people cannot easily get elsewhere, why would they come back for it, and how should that shape the design?**

**How to read this.** Each section keeps three kinds of statement apart:
- **Original (31 Oct):** what layer one said.
- **New evidence (1 Nov):** sourced and dated.
- **Updated view:** my judgement, labelled as such.

The full sourced notes are in [`evidence/`](evidence/):
- [00 Kinship today](evidence/00-kinship-position.md)
- [01 AI-native apps](evidence/01-ai-native.md)
- [02 personal CRMs](evidence/02-personal-crms.md)
- [03 small consumer apps](evidence/03-consumer-small.md)
- [04 substitutes](evidence/04-substitutes.md)
- [05 dissatisfaction and failures](evidence/05-dissatisfaction.md)

**Method and limits.**
- Six research passes on 1 Nov 2026 used product sites and docs, changelogs, App Store and Play listings (ratings, version history, in-app prices), pricing and privacy pages, GitHub, Hacker News threads, Reddit (via an archive API, since reddit.com blocks fetching), about 470 App Store text reviews, press, and founder posts.
- **Nothing was tested hands-on.** No accounts were created, no waitlists joined and no data entered anywhere, so every competitor conclusion comes from docs, store pages and reviews. Store screenshots are marketing renders that show the real UI.
- I re-checked the most load-bearing claims myself against primary pages on 1 Nov: Dex's changelog, YourPond's features page, the Keep and remember them listings, and 9to5Google on Gemini Contacts.
- No user, retention or revenue figures are estimated. Where a figure appears, it is quoted with who claimed it. Store rating counts are the only adoption signal, and they are not user counts.
- Google Play reviews, podcasts and X were mostly unreachable, and Hacker News skews technical and privacy-minded. Small samples are reported as counts, never as percentages that imply precision.

---

## Summary for the founder

1. **The thing Kinship was going to lead with is no longer rare.** "Say or type a note and it files the facts" is shipping in at least five small apps launched in 2025–26 (Keep, YourPond, Ember, Eidra, remember them). Dex added an AI note per contact from your chats in October, on for everyone by default. "Review before saving" is now table stakes. *Original layer one did not check this. It looked only at the scaled CRMs.*
2. **What is still rare is Kinship's trust layer and its follow-through loop, and both are partly built:**
   - every line traced to the user's own words;
   - a yes for sensitive and ambiguous readings;
   - "replaces / already known" when something is told again;
   - promises and open threads becoming a Moment;
   - "Did you reach Ben? → Anything worth remembering?"

   I found no competitor that documents fact-to-source tracing. YourPond explicitly discards the text. Asking afterwards how something went is close to absent.
3. **The category's killers are maintenance, broken execution, trust and novelty fade, not ugliness.**
   - Manual upkeep is the most repeated complaint: about 20 venues and 40 voices.
   - Bugs and sync failures dominate one-star reviews.
   - People quit in weeks.
   - The scaled products survive by drifting to professional networking.
4. **Two pieces of evidence push against Kinship's current rules, and need a founder decision rather than my silence:**
   - **Cadence.** Reminders "at a cadence I choose" are the most praised feature in store reviews; the complaint is about volume and "overdue" framing. Kinship forbids elapsed-time reasons.
   - **Voice.** Kinship's capture is typed only, while competitors converge on voice. The user demand for voice is thin, though: 2 voices found.
5. **Updated recommendation:**
   - Move the centre of gravity from **People** to **Tell → Today → back to Tell**.
   - Of the five structures:
     - the **Notebook's capture-and-margin** model and the **Moment Deck's finite Today** best reinforce what is defensible;
     - **the Wall should not be the People structure**, because its arranging work repeats the category's top failure (manual upkeep) and does nothing for differentiation;
     - People itself is the least differentiating surface and should get the least structural ambition.
   - This changes my 31 Oct "Deck + Wall + Notebook margin" read (§G explains exactly why).
6. **Before choosing any structure, the larger risk is distribution, not design.**
   - Main reaches one real user.
   - The alpha (promise Moments, notification, Ask, export, delete) is unmerged and has never run on a device.
   - There is no App Store Connect record.

   None of the differentiators can be validated until a small TestFlight cohort exists (§H).

---

## A. Competitive landscape

Status as of 1 Nov 2026. *Ratings* = US App Store stars (count).
- **[V]** means verified in docs, store listing or version notes.
- **[M]** means marketing claim only.
- **[3P]** means third-party, often written by a competitor.

### A1. Direct: AI or natural-language relationship apps (2024–26 wave)

| Product | Status | What it is | Ratings | Price | Source |
|---|---|---|---|---|---|
| **Keep** (Keep AI – Personal CRM) | Active, GA (v1.1.5, 11 Aug 2026) | Dictate or type a note after a call; extracts people, dates and follow-ups, several people per note. Review before save is an opt-in setting (v1.1.3). Up Next shows "Ask Hannah how the move went". Also has cadence and "gone cold" | 4.8 (5) | $7.99/mo, $49.99/yr | [store](https://apps.apple.com/us/app/keep-ai-personal-crm/id6751458016), [site](https://getkeep.xyz) [V] |
| **YourPond** | Active, GA (v2.8, ~27 Oct 2026) | "Describe" a paragraph and it becomes contact cards, reviewed before saving. Raw text is not stored. Connection scores, closeness 1–5, streaks, badges, map, family tree | 5.0 (31) | Free (25 contacts, 3 Describes/mo); Pro $10/mo | [features](https://www.yourpond.io/features), [store](https://apps.apple.com/app/id6761669539) [V] |
| **Ember** (keepember.com) | Active, shipping weekly (v1.41.0) | Chat assistant "Keeper" files notes and reminders with Confirm & save / UNDO. Has drifted into tarot, finance and astrology; ad-tracking SDKs | 5.0 (3) | Free tier; $9.99–19.99/mo | [store](https://apps.apple.com/us/app/id6770759791) [V] |
| **remember them** | Active (v1.24.4, Jul 2026) | One typed sentence is split into separate memories; "You review, tap save, done." Yearly date reminders | none yet | Free; Pro $9.99/yr | [store](https://apps.apple.com/us/app/remember-them-people-notes/id6756941740) [V] |
| **Eidra** | Stalled since 2 Jun 2026 | Voice "stories" plus a 30-second pre-meeting briefing of what to bring up | 5.0 (1) | $2.99–4.99/mo | [store](https://apps.apple.com/us/app/id6763976011) [V] |
| **Friendful** | Very early (v1.0.1, 30 Sep 2026) | AI summary per person and check-ins "based on saved plans and open threads". Visible sparkle "Ask AI" | 5.0 (1) | $8.99/mo | [store](https://apps.apple.com/us/app/id6758516896) [V-store copy] |
| **Meadow** (textmeadow.com) | **Not launched.** Waitlist page last pushed 5 Apr 2026 | Telegram bot (not SMS) that claims extraction, an "overdue" brief and a drafted first message | — | $8/mo planned | [site](https://www.textmeadow.com/) [M] |
| **Kinu** (kinu.care) | Active, GA (iOS 1.4.5, ~27 Oct 2026) | **No AI.** Notes "are never used for reminders, suggestions or anything else". Calm, private, user-set cadence, "nothing is owed" | 1.0 (1) | Free 10 people; $6.99/mo | [store](https://apps.apple.com/us/app/kinu-remember-your-people/id6760111924), [site](https://kinu.care/) [V] |
| PersonLog, Frenzz, Echo CRM | Tiny or dormant | Voice and screenshot AI profiles. PersonLog scores "closeness, energy, growth potential"; Frenzz has a "friendship health gauge" | ≤5 | ~$5.99/mo | [evidence/01 §9](evidence/01-ai-native.md) |

### A2. Direct: established personal CRMs

| Product | Status | What it is | Ratings | Price | Source |
|---|---|---|---|---|---|
| **Dex** | Active, fastest-moving incumbent (v3.79.0) | Syncs LinkedIn, Gmail, Calendar, iMessage, WhatsApp. Cadence per contact; AI drafts; voice. **Conversation Memory (Oct 2026):** each night writes a 1–3 sentence note per contact from the day's chats, turned on for everyone, opt-out | 4.4 (266) | $19.99/mo or $143.99/yr | [changelog](https://getdex.com/changelog), [store](https://apps.apple.com/us/app/id1472132715) [V]; "30,000+ users" is Dex's own claim |
| **Mesh** (formerly Clay) | Active. Acquired by Automattic 12 Jun 2025, renamed 26 Mar 2026, Android Aug 2026 | Self-building contacts from email, calendar, messages and social, plus public enrichment. Life-update feed and "reconnect"; "relationship strength", "going cold". Nexus AI (early access) drafts messages, gifts and intros | 4.4 (765) | Free (card required); $19.99/mo, $119.99/yr | [acquisition](https://automattic.com/2025/06/12/automattic-welcomes-clay), [rename](https://me.sh/stories/mesh), [TechCrunch](https://techcrunch.com/2026/08/12/mesh-automattics-crm-for-everyone-comes-to-android) [V]. TechCrunch: about 70% of customers use it for some business purpose |
| **Monica** | **Closed to new users.** Hosted v1 to be deleted end of Dec 2026; a "v3" rebuild is promised before end of 2026 | Open source, all manual, no AI. Stance: Monica "shouldn't decide how important someone is" | — | $9/mo hosted; free self-host | [rebuild post](https://monicahq.com/en/blog/we-are-rebuilding-monica), [PR #7978](https://github.com/monicahq/monica/pull/7978), [registration closed](https://monicahq.com/en/blog/registration-is-closed/) [V] |
| **Covve** | Active (v29.8); company front door now B2B lead capture | Contact sync, per-person rhythm, email-able AI assistant, streaks. End-to-end encrypted since v29. A 2020 breach exposed about 23M records | 4.5 (626) | subscription | [evidence/02](evidence/02-personal-crms.md) [V] |
| **Fabriq** | Active but in maintenance ("Bug fixes"); publisher changed | Manual, Dunbar circles, countdown rings, stock conversation starters | 4.0 (165); Play 2.5 (270) | $4.99/mo | [store](https://apps.apple.com/us/app/id1460143202) [V] |
| **Queue** | Active, indie (v2.4.2) | A Mac companion logs mail, texts and calls on the device; prompts for a note after each catch-up | 4.4 (42) | — | [evidence/02](evidence/02-personal-crms.md) [V] |
| **Hippo** | Active, tiny (v2.2) | Private notes, events, "questions to ask next time"; Siri commands | 3.0 (8) | — | [store](https://apps.apple.com/us/app/hippo-personal-crm/id1458330948) [V] |
| folk, Cloze, Nat | folk and Cloze are sales tools (Cloze now real estate); Nat probably dormant | Conversation-triggered follow-ups and action items, **for deals** | — | $24+/seat | [evidence/02](evidence/02-personal-crms.md) |
| **Discontinued or dormant** | UpHabit apps shut Apr 2026 (competitor source only); Garden dormant since Jun 2020; Contactually absorbed 2022; Nouri and FollowUp pivoted | | | | [evidence/05 §3](evidence/05-dissatisfaction.md) |

### A3. Direct: small consumer "be a better friend" apps

All of these are small: the largest has 47 US ratings. Almost all bring people back on a timer.

| Product | Model | Note |
|---|---|---|
| [Poppy](https://apps.apple.com/us/app/poppy-connection-keeper/id6759696906) (Mar 2026, free) | A garden of flowers that blooms when you check in; per-person schedule | [Show HN, 179 points](https://news.ycombinator.com/item?id=47257352): praised; called "gamifying socialization… weird"; "reminders start feeling like noise" |
| [CatchUp](https://apps.apple.com/us/app/catchup-friendship-tracker/id6450726946) (4.6, 47) | Grid of upcoming catch-ups; tip-funded | Praised for long-distance friends |
| [Tend](https://apps.apple.com/us/app/tend-stay-close-to-friends/id6759920053) | "No scores, no counters, no streaks"; a "You're caught up" card | Markets against the category's guilt |
| [Bond](https://apps.apple.com/us/app/bond-keep-in-touch/id6453560385) | Soft dates ("Late March") instead of overdue badges; one activity idea a day | Read-only after the trial, not locked |
| [The Dunbar App](https://apps.apple.com/us/app/the-dunbar-app/id6785679511), [HeyDunbar](https://apps.apple.com/us/app/heydunbar/id6757140953) | Concentric circles; a map of where friends live; "relationship health" | 0 ratings |
| [hey!](https://apps.apple.com/us/app/hey-stay-in-touch/id6738916276), [Touchpnt](https://apps.apple.com/us/app/touchpnt-friendship-tracker/id6760320698), [Buddies](https://apps.apple.com/us/app/buddies-friendship-tracker/id6763259286) | Streaks, badges, fading flowers. hey! sells a "Passive-Aggressive" reminder voice | Touchpnt's 55 ratings cluster on two days |
| [FriendVault](https://apps.apple.com/us/app/friendvault-friends-journal/id6759299538), [Lunatask](https://apps.apple.com/us/app/lunatask-a-better-to-do-list/id1583719331) relationships | A journal per person; Lunatask is a planner module with reconnect rules | Manual |
| [Kairo](https://apps.apple.com/us/app/kairo-postcard-journal/id6788220408) | Postcard journal shared with friends; reveals everyone's week on Thursday | Social, not memory |

A rough App Store name scan found 630 matching apps. 398 were first released in 2025–26, and 470 have fewer than 10 ratings ([evidence/05](evidence/05-dissatisfaction.md); the filter is noisy, so treat it as directional). **The category is crowded with near-identical indie entrants. None has demonstrated scale.**

### A4. Substitutes (what people already use)

| Substitute | What it covers | What it does not | Source |
|---|---|---|---|
| **Free iPhone stack**: Contacts birthdays, Calendar Birthdays, Reminders "When Messaging", Messages Send Later, iOS 27 Call Context (birthday prompt on a call; anniversaries in 27.2) | Birthdays and anniversaries with zero setup; a reminder that fires when you next message someone | Contacts notes are plain text with no structure, sources or capture; no promises; no event-based prompts | [MacRumors 27.2](https://www.macrumors.com/2026/09/17/ios-27-2-could-save-your-relationship/), [Apple: When Messaging](https://support.apple.com/en-ie/102484) |
| **Siri AI** (iOS 27, beta from 14 Sep 2026; English, waitlist, iPhone 15 Pro+, not in the EU) | Searches Messages, Mail, Notes, Reminders and photos on request | No memory across conversations, no proactive relationship moments. Siri Recap (Watch conversation summaries) is announced, not shipped | [Apple newsroom](https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/), [hands-on](https://www.macrumors.com/2026/06/10/ios-27-siri-ai-hands-on/) |
| **Gemini Personal Intelligence + Google Contacts** (Contacts integration still rolling out; first seen on an AI Ultra account) | Reminds of saved dates, suggests people to reach out to, suggests details to save to a contact. Daily Brief free in the US since Sep 2026 | Per-contact fields, not sourced memories; "reach out" is a nudge, not tied to an event; needs Google's own apps; excludes the EEA and UK | [9to5Google Contacts](https://9to5google.com/2026/06/05/gemini-google-contacts/), [Personal Intelligence](https://9to5google.com/2026/01/14/gemini-personal-intelligence/), [Daily Brief](https://9to5google.com/2026/09/08/gemini-daily-brief-free/) |
| **ChatGPT memory** ("Dreaming" update from Jun 2026; memory sources under a response since May 2026) | Remembers what you mention, rewrites stale facts, shows which memories shaped an answer | Memory belongs to the account, not to a person. A user describes people facts fragmenting and confusing nicknames. Pulse was retired 17 Jun 2026; scheduled tasks are user-set | [OpenAI](https://openai.com/index/chatgpt-memory-dreaming/), [forum](https://community.openai.com/t/people-relationships-memory-with-person-centered-temporal-context/1401089), [Engadget](https://www.engadget.com/2196844/chatgpt-now-has-a-hub-for-scheduled-tasks/) |
| **Claude, Copilot, Meta AI** | Editable memory (Claude, Copilot) | No proactive relationship features. **Meta uses AI chats to personalise ads** (no opt-out outside the UK, EU and South Korea) | [Claude help](https://support.claude.com/en/articles/11817273-using-claude-s-chat-search-and-memory-to-build-on-previous-context), [The Register](https://www.theregister.com/2025/10/01/meta_ai_use_informs_ads/) |
| **Journals and notes**: Day One, Rosebud, Mem, Apple Notes, Notion and Obsidian personal-CRM templates | Free-form capture; AI recall of your own entries (Day One Gold, Rosebud) | About the writer, not the people. DIY CRMs default to "haven't contacted in X" and need "a lot of dedication" | [Day One](https://dayoneapp.com/guides/ai-features/), [evidence/04 §4](evidence/04-substitutes.md) |
| **Facebook birthdays, group chats** | The historical default for birthdays | Users who left Facebook miss it (about 7 voices) | [evidence/05 §1.12](evidence/05-dissatisfaction.md) |

No rigorous recent data exists on how people remember friends' details. The best available is a Facebook-commissioned 2018 Australian poll (n = 1,076): 42% Facebook, 38% phone calendar, 22% nothing ([evidence/04](evidence/04-substitutes.md)). I give no prevalence figures beyond this.

---

## B. Teardowns: the eight most relevant

The eight are chosen for how directly they challenge Kinship, not for size. Each is from docs, store pages and reviews only, not hands-on.

### B1. Keep: the closest functional match
- **Get started:** manual, business-card scan, or just name people inside a note.
- **Capture:** dictate or type after a call or coffee. Recording continues if you switch apps. "One rambling note about three people" becomes three entries.
- **Understanding:** people, dates, follow-ups, preferences, family, gift ideas; natural-language dates become reminders. [V-store]
- **Representation:** a people list sortable by "catch-up need", one timeline per person, and **Up Next** (Overdue · Next 7 days · Events · Reminders). [Screenshot](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c2/50/3f/c2503f55-b1d6-cf90-5368-855f20eb54fd/02_03-follow-ups_keep_app_store_iphone_en.png/600x1300bb.jpg).
- **Bringing back:** **follow-ups taken from what you said** ("Ask Hannah how the move went", "Send Priya the restaurant recommendation"), plus cadence, a "silence detector" and "gone cold".
- **Action:** "what to say" is marketing; tone and length controls suggest generated text. No booking or sending.
- **After contact:** depends on you writing another note. No "how did it go?".
- **Trust:** review and edit before saving, **opt-in in Settings**. Local-first, Markdown/CSV export. The user picks among named AI models, so the AI is visible. No handling for sensitive readings is documented.
- **Who and how much:** $7.99/mo. Pitched at sales reps, founders and investors as well as friends. 5 ratings.
- **Why it matters:** it shows Kinship's capture plus event-follow-up idea is **buildable by one developer and already on the store.** What Keep lacks:
  - traceability from a fact to its words;
  - consent for sensitive readings;
  - a refusal of cadence;
  - a consumer tone.

### B2. YourPond: the most polished consumer AI capture
- **Capture:** "Describe" a paragraph and it becomes several contact cards. Apple speech on iOS.
- **Understanding:** names, cities, jobs, how you met, family, pets. **"You review everything before it's saved." "YourPond never stores the raw text you type."** (re-checked 1 Nov).
- **Representation:**
  - home with counts (people, places, moments);
  - "Your Places" map, Pond Passport stamps, family tree, network graph;
  - **"76 · Deeply connected"**, a completeness score, closeness 1–5;
  - a "5 days running" streak, about ten badges, a frog mascot.
- **Bringing back:** birthdays, repeating reminders, and closeness rating driving how often it nudges. Not events from conversations.
- **Action:** gift tracking, with a thank-you reminder when you receive a gift.
- **Trust:** review before save, JSON/CSV export, a named AI vendor, "never used to train". 13 processors listed.
- **Price:** free tier allows **3 Describes a month**; Pro $10/mo.
- **Why it matters:** it is the brand-and-warmth competitor that also has AI capture. It is also the clearest example of what Kinship refuses: it quantifies everything, and because it throws the words away, nothing can be traced back.

### B3. Dex: the incumbent moving into Kinship's space from the professional side
- **Get started:** imports LinkedIn, Gmail, Calendar, iMessage, WhatsApp, Instagram.
- **Capture:** voice mode, dictation with AI clean-up, text Dex by SMS or WhatsApp, Granola meeting notes.
- **Understanding:** Conversation Memory (Oct 2026) reads each day's chats and writes a 1–3 sentence summary per contact. That is summary-level, not structured promises.
- **Bringing back:** weekly, monthly or quarterly cadence, which now resets automatically when you message someone.
- **Action:** AI drafts, mail merge.
- **Trust:** Conversation Memory is **on for everyone, opt-out, with no per-note approval**. Notes go to third-party model providers. Some data is enriched from the public web.
- **Price:** $19.99/mo or $143.99/yr. Its founder told Axios in 2019 that Dex is for loose ties, not family and close friends.
- **Why it matters:** if Dex points its passive ingestion at close relationships, it has zero-input capture that Kinship can't match without reading messages, which Kinship has ruled out. Dex's opt-out default is the counter-position Kinship can credibly own.

### B4. Mesh (formerly Clay): zero data entry, with a messaging platform behind it
- **What it does:** builds contacts automatically from email, calendar, messages and social accounts, plus public enrichment, and shows a life-update feed (birthdays, job changes, news).
- **Bringing back:** "reconnect" and "going cold".
- **Nexus AI (early access):** drafts, gift ideas, intros, pre-call briefs. Automattic also owns Beeper, which can already take drafts.
- **Complaints:**
  - About 28 of 55 low-star reviews mention bugs or sync failures.
  - At least 7 reviews object to a card being required for the free tier.
  - People found **profiles of themselves** built by other users ("Privacy lawsuit waiting to happen").
- **Why it matters:** it has the most resources and the clearest path to becoming a messaging-native assistant. But its scraping and enrichment model is the strongest negative trust story in the category, and TechCrunch reports about 70% business use.

### B5. Kinu: the tone competitor, with no AI
- **What it does:**
  - manual person pages, typed and voice notes, user-set cadence and rituals;
  - "Skip one and it goes; nothing piles up, nothing is owed";
  - a "Relational Compass" ordered by how close you are.
- **Privacy:** local-first, with encrypted sync.
- **Price and adoption:** free for 10 people, then $6.99/mo; about 100 Play downloads and 1 App Store rating.
- **Why it matters:** it already sounds the way Kinship wants to sound. **Tone is not a differentiator.** Its founder's post cataloguing [dead personal CRMs](https://kinu.care/blog/personal-crm-apps-shut-down) shows the indies know the category's history.

### B6. Poppy: the garden metaphor, live on the market
- **What it does:** a garden that blooms as you check in on a per-person schedule. Free. Launched March 2026.
- **Reception:** the richest reaction data for a Kinship-like metaphor ([HN](https://news.ycombinator.com/item?id=47257352)). There is delight, and also "gamifying socialization… weird", "reminders start feeling like noise", and a request for an "Oak" version. Ten commenters criticised AI-written marketing and fake testimonial avatars.
- **Why it matters:**
  - It confirms layer one's anti-reference: a garden that grows with contact is the cadence in costume.
  - It shows that the Electric Garden look **alone** reads as "another plant app".
  - **New:** an audience on the technical side punishes AI-generated marketing and fake faces. That is directly relevant to how Kinship presents its own fictional sample people.

### B7. The free iPhone stack plus Siri AI: the default substitute
- **Birthdays:** a solved commodity. Birthdays in Contacts and Calendar, and in iOS 27 the Phone app shows a birthday prompt when you call.
- **Promises:** "When Messaging" reminders cover a promise if you set the reminder yourself.
- **Siri AI:** can search your messages, but has no cross-conversation memory, and Recap is not shipped.
- **Why it matters:** **Kinship cannot lead with birthdays.** A Today that shows mostly birthdays offers nothing beyond iOS. The trajectory matters too: Apple can add per-person memory and proactive moments at the OS level, with privacy credibility. Nothing shipped yet does that.

### B8. Gemini and ChatGPT: general memory, getting closer
- **Gemini:**
  - Personal Intelligence connects Gmail, Calendar and Photos, is off by default, and explains which information it used.
  - The Contacts integration (rolling out) reminds of dates and suggests people to reach out to.
- **ChatGPT:**
  - Memory shows which memories shaped an answer (May 2026), and keeps an editable summary.
  - Proactive "Pulse" was retired in June 2026.
- **Neither:**
  - keeps memory **per person** with dates;
  - asks consent before keeping a sensitive reading;
  - follows up on a promise.
- **Why it matters:**
  - The "AI remembers things you said" claim is now a general-assistant feature.
  - Kinship's difference has to be **person-shaped memory that is correct, sourced and acted on at the right moment**, without the user having to ask.
  - Their trend is towards source display (ChatGPT) and contact integration (Gemini). Either could narrow Kinship's gap. No timeline is evidenced, so I don't give one.

---

## C. Capability matrix: Kinship as actually built vs the closest competitors

**Kinship status:**
- **M** = shipped on `main`, but behind per-account flags enabled for the founder and one test account.
- **A** = implemented in PR #74/#75, **not merged, not deployed, never on a device**.
- **P** = planned only.
- **—** = absent; **✕** = forbidden by contract.

**Competitor cells:** ✓ = documented; ◐ = partial or claimed; — = not found. Cells are from docs and stores, not hands-on.

| Capability | Kinship | Keep | YourPond | Dex | Mesh | Kinu | iPhone stack | Gemini / ChatGPT |
|---|---|---|---|---|---|---|---|---|
| Natural-language capture, typed | **M** | ✓ | ✓ (3/mo free) | ✓ | ◐ | — | — | ✓ |
| Voice capture | — (keyboard dictation only; own voice is P, D5 on-device) | ✓ | ✓ | ✓ | ◐ testing | ◐ voice notes, not parsed | ◐ Siri | ✓ |
| Passive capture from messages or email | ✕ by rule | — | — | ✓ | ✓ | — | ◐ Siri search | ✓ Gemini |
| Several people from one story | **M** | ✓ | ✓ | — | — | — | — | ◐ |
| Who-is-who asks instead of guessing | **M** | — | ◐ matching | — | — | — | — | — |
| Vague dates kept vague ("sometime in November") | **M** | ◐ NL dates | — | — | — | — | — | — |
| Review before saving | **M** (clear lines auto-save with Undo; held lines wait) | ✓ opt-in | ✓ | ✕ opt-out | — | n/a | n/a | ◐ edit after |
| **Yes required for sensitive readings** | **M** | — | — | — | — | n/a | n/a | — |
| **Each fact traced to the user's words** | **M** (DB constraint, Source view) | ◐ timeline | ✕ text discarded | ◐ dated note | — | n/a | — | ◐ ChatGPT per answer |
| Told again → "replaces / already known" | **M** (residence fully; general contradiction deferred) | — | — | — | — | — | — | ◐ ChatGPT rewrites |
| Birthdays without setup | **M** (from Contacts) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ Gemini |
| Upcoming and passed events from what you said | **M** | ✓ | — | — | — | — | — | — |
| **Your own promises and open threads brought back** | **A** | ◐ follow-ups | — | — | — | — | ◐ manual reminder | — |
| Cadence or "gone cold" | ✕ by rule | ✓ | ✓ | ✓ | ✓ | ✓ | — | ◐ Gemini |
| **After contact: "Did you reach X?" → "anything worth remembering?"** | **M** | — | — | ◐ auto-log | ◐ auto-log | — | — | — |
| Grounded talking points ("You could mention") | **M** | ◐ | — | ◐ drafts | ◐ briefs (EA) | — | — | ◐ on request |
| Message drafting | ✕ in V1 (D9) | ◐ | — | ✓ | ◐ EA | — | — | ✓ on request |
| Gifts | ◐ recall via Ask (**A**) | ✓ ideas | ✓ tracking | — | ◐ EA | — | — | ◐ on request |
| Ask your memory | **A** (word matching; misses paraphrases) | — | — | ✓ | ✓ Nexus | — | ◐ Siri search | ✓ |
| Notification of the day's moment | **A** (≤3/7 days; private lock-screen text; delivery unverified) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ birthdays | ✓ Daily Brief |
| Widget or ambient surface | P (held) | — | — | — | — | — | ✓ | — |
| Quantifies relationships | ✕ never | ✓ "gone cold" | ✓ scores, streaks | ◐ cadence | ✓ strength | ◐ compass order | — | — |
| Visible AI | ✕ never | ✓ model picker | ✓ vendor named | ✓ | ✓ Nexus | n/a | ✓ Siri | ✓ |
| Export | **A** | ✓ | ✓ | ✓ CSV | ✓ CSV | ✓ JSON | ◐ vCard | ◐ |
| In-app account deletion (2.0) | **A** | n/a (no account) | ✓ | ✓ | ✓ | ✓ | n/a | ✓ |
| Local-first or E2EE | SQLCipher on device; server-side understanding; no E2EE (D11) | local | — | — | — | local, E2EE sync | ✓ | — |
| Distribution | **1 real user; no TestFlight; no App Store record** | App Store | App Store, web | App Store, web | App Store, Android, web | App Store, Play | built in | built in |
| Price | hypothesis $4.99/mo (D10) | $7.99/mo | $10/mo | $19.99/mo | $19.99/mo | $6.99/mo | free | free to paid |

**What the matrix says, plainly:**
- **Kinship is ahead on the trust and understanding details:** sources, sensitive yes, who-is-who questions, vague dates, told-again.
- **Kinship is uniquely complete on closing the loop.**
- **Kinship is behind on:**
  - capture modality (no voice);
  - proactivity (no notification on main);
  - recall (word matching only);
  - basic hygiene (export and delete only in the alpha);
  - above all, distribution.
- Its two deliberate refusals, no cadence and no drafting, are where competitors offer what users praise.

---

## D. Market insights

### D1. What frustrates users and why they leave (ranked by evidence; counts are approximate distinct venues / voices from [evidence/05](evidence/05-dissatisfaction.md))

1. **Manual upkeep: about 20 / 40, repeated across every source type.** It takes two forms:
   - typing after every interaction;
   - cleaning up after auto-import (duplicates, failed merges). *Automation moved the work, it didn't remove it.*

   One maker says Notion, Dex and Monica "all died the same way": no logging by week 3, quit by week 6 ([Product Hunt](https://www.producthunt.com/p/vellaci/vellaci); one maker's own account).
2. **Broken execution: about 90 one- and two-star store reviews.** Bugs, sync failures, SMS codes that never arrive, no support. Mostly from people who *wanted* it to work.
3. **Privacy: about 15 / 60, heavy on Hacker News.** Two distinct worries:
   - trusting the company with my own data;
   - profiles of **my friends** built without their consent. Four of Clay's eight Trustpilot reviews come from non-users objecting to profiles of themselves.

   **No user complained about AI training;** vendors raise that themselves.
4. **Price: about 14 / 35.** "not paying hundreds per year to remember to call my sister" ([HN](https://news.ycombinator.com/item?id=47262797)). Card-first free tiers draw complaints.
5. **Novelty fades: about 12 / 30.** People retreat to Obsidian, Notion, Contacts notes or spreadsheets.
6. **"Creepy" or transactional: about 14 / 30, but contested.** In one Obsidian thread a "sociopathic" comment scored −44, while replies framing these tools as an accommodation (ADHD, autism) scored +34 to +51 ([thread](https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/)). **Framing matters more than function.**
7. **Distrust that the product will last: about 8 / 25.** Monica's rewrites, Fabriq's silence, UpHabit's shutdown.
8. **Reminder guilt: about 8 / 11, weaker than expected.** Reminders are also the **most praised** feature. The complaint is about volume and "overdue" framing.
9. Poor search or recall is thin (about 6 voices, about basic search).

### D2. What users want (ranked)
1. **A gentle nudge at a cadence they choose.** Very strong: 20+ Fabriq reviews, about 8 Garden.
2. Birthdays without setup. Strong, but **commoditised by iOS and Gemini**.
3. Simple, with no upsell. Strong.
4. **A quick note on what we talked about, attached to the check-in.** Strong as a missing feature (Fabriq, Garden, CatchUp).
5. Automatic logging from WhatsApp, iMessage and email. Strong, mostly professionals.
6. Help knowing what to say. Moderate; a counter-voice calls generated talking points creepy.
7. **Remembering commitments** ("next time I'll bring X", "I promised an intro"). Moderate but distinctive: [r/ObsidianMD](https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhdy2za/), r/SaaS, plus a founder's customer interviews.
8. Local, private, or a one-time price.
9. **Ambient visibility over notifications.** Widget requests, photos of friends on the fridge, plants named after friends.
10. Voice capture. **Thin from users (2 voices), strong vendor convergence.** Treat it as a hypothesis.

**Recurring life situations** where people praise these apps:
- long-distance friends and moving (about 8);
- leaving Facebook and losing its birthday prompts (about 7);
- new parents and kids' names (about 5);
- grief and ageing (about 5);
- ADHD "out of sight, out of mind" (about 12 venues, demand side).

### D3. Commercial pattern (my inference, labelled)
- The leaders are small: Mesh 765 ratings, Dex 266, Fabriq 165.
- The scaled products drift to **paid professional networking** (Dex, Mesh Teams, Covve's B2B front door, UpHabit, Cloze, Contactually).
- Friends-and-family products stay tiny, tip-funded or go dormant.
- **I found no founder post-mortem that blames the business model.** The founder-side statements blame data entry and side-project capacity.
- Willingness to pay for "remember my friends" is limited and contested, and Kinship's $4.99/mo hypothesis is untested.

### D4. Under-served opportunities

| Opportunity | Evidence it's wanted | Who serves it today | Gap |
|---|---|---|---|
| Follow-through on commitments made in conversation | Moderate, distinctive (D2 #7) | Keep (from notes), folk and Cloze (for deals) | No consumer product brings back **your own** promise and asks if it happened |
| A note on what we talked about, made effortless at the moment of contact | Strong as a missing feature (D2 #4) | Queue (Mac logging), Dex (auto-log) | Prompted, low-effort capture **right after** contact, with no message reading |
| Trustworthy memory of sensitive things | Indirect: privacy is the #3 complaint; Meta ads; Dex opt-out; Mesh profiles | Nobody handles sensitive readings specifically | A yes for each sensitive reading, sources, no enrichment of third parties |
| Help that isn't a reminder *or* a ghostwriter | Moderate (D2 #6, with a creepy counter-voice) | Drafts (Dex, Mesh), stock starters (Fabriq) | Grounded prompts from what the friend actually told you |
| Ambient presence | Moderate (D2 #9) | iOS widgets generally | Category widgets are broken or absent |

---

## E. Differentiation hypotheses: the three strongest, with evidence for and against

Each candidate advantage from the brief, classified:

| # | Candidate | Classification | Why |
|---|---|---|---|
| 1 | Conversational understanding with minimal input | **Already common** (capture). **Rare** in the fine-grained parts: identity questions, vague dates, told-again | Keep, YourPond, Ember, remember them and Dex all capture. Kinship's parsing details are undocumented elsewhere. And Kinship is *behind* on voice |
| 2 | Accurate, source-grounded relationship memory | **Rare / meaningfully differentiated** | No competitor documents fact-to-words tracing; YourPond discards text. ChatGPT shows sources per answer, not per person |
| 3 | Opportunities from real events, promises and unfinished conversations, not cadence | **Offered by some, improvable** | Keep (follow-ups from notes), Friendful (claimed), Eidra (briefings). All of them mix it with cadence. Kinship's promise and thread Moments are alpha only |
| 4 | Helping take real-world action | **Merely hypothesised** for Kinship | Built: hand-off plus grounded "You could mention". Competitors draft (common). Nobody plans or books. CC-28 is thesis |
| 5 | Closing the loop after meaningful interactions | **Rare** | Kinship main has return check → "anything worth remembering?"; Queue prompts for a note on Mac; nobody asks about your promise. Value **unverified** |
| 6 | Trustworthy correction, consent and control | Review before save: **common**. Yes for sensitive readings: **rare**. Export and delete: **common** (Kinship's are alpha only) | — |
| 7 | A uniquely welcoming consumer experience | **Common as a claim** (Kinu, Poppy, Tend, Bond). **Rare in combination** with real understanding and no scoring | Tone alone is not a differentiator |

**Product differentiation vs a sustainable advantage.** None of these is a moat today.
- With one real user there is no network, data or brand effect.
- Anything visible (a Source link, a margin, a promise card) can be copied in weeks by an indie developer, as Keep shows.
- What *could* become durable, if it holds up with real users:
  - **(i) accuracy and trust of the understanding pipeline,** proven against an evaluation corpus. That is costly to replicate well, and most competitors aren't trying.
  - **(ii) a personal, sourced record that grows more valuable over years,** though deliberate export lowers lock-in.
  - **(iii) a reputation for never scoring, scraping or selling.** That is costly for incumbents to adopt, because their models depend on the opposite.

These are hypotheses about defensibility, not facts.

### Hypothesis 1: "It remembers exactly what you told it, and shows you where": trustworthy person memory
**Claim:** Kinship is the place where what you learn about someone is kept correctly and traceably:
- the user's own words, sourced;
- sensitive things only with a yes;
- updates that say what they replace;
- no guessing about who or when.

**For:**
- No competitor documents fact-to-source tracing.
- YourPond deliberately throws the words away.
- A ChatGPT user describes people facts that fragment, go stale and confuse nicknames ([forum](https://community.openai.com/t/people-relationships-memory-with-person-centered-temporal-context/1401089)).
- Privacy is the third-strongest complaint.
- Dex chose opt-out AI notes, and Meta uses chats for ads, which gives Kinship clear counter-positions.
- Kinship has this **built on main**: a DB constraint, the Source view, sensitivity classes, identity questions.

**Against:**
- **No user in the evidence asked for "sources".** People ask for reminders and less work. Trust may be a *hygiene* factor that is noticed only when it fails, not a reason to choose.
- Review before saving is now table stakes, so "you're in control" doesn't distinguish.
- The surface is easy to copy.
- Kinship's own record has gaps: the general contradiction prompt is deferred, and the Ask paraphrase miss shows recall is still weak.

**Verdict:** the strongest *defensible* difference, and it's real, but it has to be made **felt** (in the moment a memory is right when it matters), not explained.

### Hypothesis 2: "It helps you follow through": promises and open threads become one moment, then the loop closes
**Claim:**
- "I said I'd send Maya that recipe", "Ben's race is Saturday" and "Leo was waiting to hear about the job" come back once, at the right time.
- After you reach out, Kinship asks once whether anything is worth keeping.
- No timers, no overdue.

**For:**
- Commitments slipping is a distinctive, repeated want.
- "A quick note attached to the check-in" is a strong missing feature in reviews.
- Keep's follow-ups prove the pattern is buildable and wanted.
- **Nobody asks about your own promise or closes the loop with a capture prompt.**
- This answers the category's #1 killer at the right moment: it asks for input right after contact, when there is something to say, not as general upkeep.
- Partly built: return check on main; promise and thread Moments plus the promise loop in alpha.

**Against:**
- Keep already does event follow-ups.
- **The supply problem:** someone who tells Kinship little gets few Moments and falls back to birthdays, which iOS already gives free.
- **The cadence tension:** users praise "remind me every N weeks". With no cadence, a quiet person may never come back.
- The alpha pieces are unproven on a device, and the notification is unverified.

**Verdict:** the best candidate for the **reason to return.** It depends entirely on capture volume, so it's coupled to the input burden.

### Hypothesis 3: "Care without keeping score": a consumer product for close relationships that never manages people
**Claim:**
- Kinship is for family and close friends, not networks.
- It never scores, ranks, streaks, scrapes or shows AI.
- It feels like being a good friend, not running a CRM.

**For:**
- "Creepy, transactional, built for sales" is repeated.
- **Framing decides acceptance** (the Obsidian-thread voting).
- Several new entrants market "no streaks, no guilt", which suggests the founders see guilt as the category's known failure.
- The serious, scaled products have drifted to professionals, leaving close relationships served by tiny manual apps or gamified ones.
- Monica's founder takes the same stance ("shouldn't decide how important someone is").

**Against:**
- Tone is **contested** (Kinu, Tend, Bond, Poppy all claim it).
- It's positioning, not capability; anyone can say it.
- The friends-and-family segment is where willingness to pay looks weakest.
- Refusing cadence and drafting removes two features users praise.

**Verdict:** necessary framing, not a differentiator on its own. It becomes distinctive **only in combination with** Hypotheses 1 and 2. That combination (real understanding plus traceable memory plus follow-through, without scoring) is the one I found nobody shipping.

---

## F. Strategic recommendation (proposal; founder decision)

**Positioning (draft):** *Tell Kinship what people share with you. It keeps it exactly, in your words, and brings back the moments you'd want to show up for: what they're going through, what you said you'd do, what you're waiting to hear. Nothing is scored. You decide what it keeps.*

**Initial target audience (hypothesis to test, §H):**
- **Adults who already try to remember what friends and family tell them, and keep failing.** Concretely, people who already keep Contacts notes, a notes app or a reminders list about people. That behaviour is the proven demand, and the DIY retreat is where competitors' users end up.
- **The use case to test first:** close people at a distance or in a busy life stage: friends who've moved, new parents, adult children of ageing parents. These are the situations reviews praise most.
- **People with ADHD** describe the exact problem ("out of sight, out of mind") but are a sensitive audience. Kinship should not market a health claim; treat them as a cohort to listen to, not a positioning.

**Core value proposition, in one line:** *Remember what matters to them, and follow through on it, without managing them.*

**Why repeated use (the hypothesis to prove):** value has to come back to the user within days of telling, as a Moment that was right and well-timed. It must not depend on a growing archive. The loop is Tell → Moment → contact → "anything worth remembering?" → Tell. The evidence says products die at weeks 3–6 when that loop isn't paying back.

**Deliberately avoid becoming:**
- **A personal CRM:** a contact list plus cadence, a network, a sales or professional tool, enrichment from public data, or importing everyone.
- **A birthday app:** iOS and Gemini do this free; birthdays are a floor, not the product.
- **A chat assistant** or "AI friend". General assistants already own that, and it breaks contract §3.
- **A ghostwriter** that drafts and sends.
- **A gamified garden:** growth, streaks or health. Poppy, Buddies and YourPond own that, and users call it weird.
- **A message reader:** passive ingestion of iMessage or WhatsApp. It's the zero-input route Dex and Mesh take, but it is the category's privacy wound, and it's ruled out by the contract.
- **A product that wins on screens.** Execution failures (bugs, sync, sign-up) are the largest single cause of one-star reviews.

**Founder decisions this raises (each needs a recorded decision; none is assumed):**
1. **Cadence.** Keep the no-elapsed-time rule, or allow an **explicit, user-declared intention** ("I want to see Sam more this autumn")? The contract already defers Reconnect "with an explicit Intention". Evidence: reminders are the most praised feature, and the complaints are about "overdue" framing, not reminders themselves. This is a test question first (§H, Test 2), not a change.
2. **Voice.** Keep it deferred (D5: on-device only), or prioritise it? Evidence: vendors converge on voice, but only 2 users asked for it, and keyboard dictation already works. Test before deciding.
3. **Order of work.** Design structure first, or distribution and validation first? My recommendation: get the alpha to a small TestFlight cohort before committing a structure (§I).
4. **T4** is still pending for every structure in PR #76.

---

## G. Design implications: the five PR #76 structures, reassessed

**Original (31 Oct):** Deck and Wall are strongest and combine well (Deck as Today, Wall as People); take the Notebook's margin review whichever is chosen; Almanac and Atlas work as lenses.

**What the new evidence changes:**
- **Manual upkeep is the #1 reason people quit.** Any structure that asks the user to arrange, group or maintain things is a liability.
- **Event and follow-up capture is shipping elsewhere.** Kinship's distinctiveness is in **trust (sources, consent) and the follow-through loop**, so the structures that put those on screen matter most.
- **Birthdays are commoditised.** A Today that is mostly birthdays is iOS with a nicer coat.
- **Recognition grids exist** (CatchUp, Fabriq, Kinu's grid, Contact Posters), and a garden metaphor is live (Poppy). People and the visual skin are not where Kinship can differentiate.

| Structure | Genuinely different interaction model? | Solves an unmet problem? | Improves differentiation? | Resembles | No photos / little memory | 5 vs 100 people | Maintain relationships or time in app? |
|---|---|---|---|---|---|---|---|
| **1 · Moment Deck** | Yes: finite full-bleed moments that end; Lock Screen | Yes, if moments come from promises and threads (Hypothesis 2); ambient visibility is a stated want | **Strong for H2**, neutral for H1 | Tend's "caught up", Bond's one idea a day, Apple Invites posters | No photos: type-led posters work. **Little memory: the deck collapses to birthdays, i.e. iOS.** It needs the supply loop | Independent of people count (good) | **Maintain**: it ends, and pushes outward |
| **2 · Wall** | Moderately: equal prints, user-named groups, no tabs | Weakly: recognition is nice to have, not a reported pain. Custom groups were asked for once (Fabriq) | **None** for H1 or H2 | CatchUp grid, Fabriq launcher, Kinu grid, Contact Posters | **No photos: a wall of initials.** Little memory: fine, but empty | 5: lovely. **100: arranging is the upkeep users quit over** | Risk of **time in app** (arranging, browsing) |
| **3 · Almanac** | Yes: time as the spine, pinch week, season, year | Partly: planning ahead; vague dates kept vague is distinctive | Moderate for H1 (vague dates); dates are commoditised | Calendar views; no seasonal framing found | People with no dates are thin; little memory means a sparse calendar | Scales well | Neutral |
| **4 · Atlas** | Yes: place-first, postcards | **New evidence:** long-distance friends is the use case reviews praise most | Weak for H1 and H2 | YourPond "Your Places" map, Dunbar App map, Kairo postcards | Needs told places (T8: never addresses); most people are local | 100 people cluster at home | Neutral to browse-heavy |
| **5 · Notebook** | Yes: you open it and you're writing; understanding in the margin beside your words | **Yes: capture friction and trust at once.** It answers the #1 killer at the input step, and nobody shows understanding beside the words (remember them uses a separate sheet; YourPond discards them) | **Strongest for H1**, supports H2 (the after-contact note lands on a page) | Per-person journals (FriendVault, Lunatask), Bears Gratitude, Cardhop | **No photos: unaffected.** Little memory: a page is never "empty", it's an invitation | Scales; People becomes an index of pages | **Maintain**: writing is the input. Risk: less glanceable |

**Evaluating the earlier Deck + Wall + Notebook margin combination, without assuming it:**
- **Deck as Today: keep.** It best expresses Hypothesis 2 and the "less time in app" stance, which this research reconfirms (Pulse retired; ambient visibility wanted). Its weakness is supply, which is a capture problem, not a Deck problem.
- **Wall as People: reconsider; I no longer recommend it.**
  - Its signature (user-named groups, hand arrangement) is maintenance, the category's top killer.
  - It depends on photos most users won't add.
  - It resembles existing grids.
  - It advances neither defensible hypothesis.
  - Equal-size prints remain a fine *presentation* rule, but the Wall shouldn't be the People *structure*.
- **Notebook: promote from "take its margin" to a structural candidate for Tell and the person page.** It is the only one of the five whose core interaction *is* the differentiator: your words, with Kinship's understanding beside them, traceable and correctable.
- **People: give it the least structural ambition.** The evidence shows no user pain about how a people list looks. The pain is maintenance and recall. Which structure replaces T4 is still the founder's call; the competitive evidence doesn't favour any particular People layout.
- **Almanac and Atlas: still lenses.** Atlas gains a little from the long-distance evidence.

**Updated read (my judgement, not a decision):**
- The strategy points to **Notebook-led capture and person pages + Moment Deck Today.**
- People should be a light index that needs no upkeep.
- Wall, Almanac and Atlas should be presentation rules or lenses, not structures.
- I have **not** designed this combination. Per the brief, no new concepts until the founder chooses.

**What changed my mind, exactly:**
- the dissatisfaction tally ranking manual upkeep first (§D1);
- the recognition grids already on the market (§A3);
- the shipping NL-capture apps that make capture alone common (§A1);
- YourPond's discarded text and Dex's opt-out notes, which make traceability and consent the open ground (§B).

---

## H. Validation plan: three tests with real prospective users

**Prerequisites and guardrails:**
- Tests 2 and 3 need the alpha on a device, so they need a **TestFlight build and an App Store Connect record**, which don't exist yet.
- Participants use their own accounts. The 2.0 flags go on **per account, each with the founder's explicit yes for that id**.
- Nothing is seeded into real accounts.
- Consent covers server-side understanding (D2/D3).
- Results report **n and counts**; with these sample sizes, no p95 or significance claims.
- Recruiting outside the founder's circle (screener, any incentive) is outward-facing and needs the founder's approval.

### Test 1: Is Kinship's memory trusted more, and does trust change behaviour? (Hypothesis 1)
- **Who:** 12–15 adults who already keep notes about people (Contacts notes, a notes app or reminders). Screen for it.
- **Setup:** a 45-minute moderated session. Each tells Kinship about 3 real people, from conversations in the past two weeks, including one sensitive item they choose to share.
- **Comparison:** the same notes put into one baseline they'd plausibly use instead (Apple Notes, or ChatGPT with memory), counterbalanced. A week later, a recall task: "What did Sam say about her job? What did you promise Leo?"
- **Measures:**
  - share of kept lines the participant judges correct without editing;
  - corrections needed;
  - whether they open a source unprompted;
  - recall accuracy and time at one week vs baseline;
  - a 1–7 rating for "I'd trust this with something private about a friend";
  - for the sensitive item, whether the yes step feels respectful or burdensome.
- **Success:**
  - ≥ 85% of kept lines judged correct;
  - ≥ 10 of 15 rate Kinship higher than the baseline for trust with private things;
  - one-week recall beats the baseline for ≥ 10 of 15;
  - the sensitive yes is rated "respectful" by ≥ 10 of 15.
- **Disproves it if:** trust ratings don't separate from the baseline, or users ignore sources entirely and the yes step reads as friction.

### Test 2: Does follow-through bring people back after week 3? (Hypothesis 2, and the cadence question)
- **Who:** 15–20 participants from the target audience, on the alpha build, for 4 weeks.
- **Measures:**
  - Moments shown, and Moments acted on (the user says "Yes, I reached X" through the return loop);
  - the share of acted-on Moments from promises or threads vs birthdays;
  - Tells after contact ("anything worth remembering?" accepted);
  - **the share of participants still Telling in weeks 3 and 4**;
  - notification opt-in and opt-out;
  - an exit interview with one explicit question: *"Was there anyone you wished Kinship had reminded you about, with nothing to go on but time?"* That is the cadence question.
- **Success:**
  - ≥ 10 of 15 still Telling in week 4;
  - a median of ≥ 1 acted-on Moment per participant per week;
  - ≥ 40% of acted-on Moments from promises, threads or events rather than birthdays;
  - ≥ 50% accept the after-contact prompt at least once.
- **Disproves it if:**
  - Moments are mostly birthdays;
  - week-3 drop-off matches the category's (most stop by week 3);
  - a majority name people they wanted a time-based nudge for. That is the evidence for founder decision F1.

### Test 3: Positioning, framing and willingness to pay (Hypothesis 3)
- **Who:** 30–40 people from the target audience, unmoderated. A survey panel needs the founder's approval.
- **Stimulus:** three short concept descriptions with one representative screen each, using fictional people labelled as examples:
  - **(a)** a personal CRM with cadence and scores (YourPond/Dex-like);
  - **(b)** Kinship's positioning from §F;
  - **(c)** a gamified garden (Poppy-like).
- **Measures:** preference; "this would feel like managing my friends" (1–7); "I'd use this for my closest people"; Van Westendorp price questions; whether they'd pay at $4.99/mo.
- **Success:**
  - (b) preferred by ≥ 50%;
  - lowest "managing my friends" score of the three;
  - a median acceptable price ≥ $3.99/mo, with ≥ 30% saying they'd pay $4.99/mo.
- **Disproves it if:** the CRM framing is preferred (the professional drift is the real market), or the acceptable price is near zero.

---

## I. Roadmap implications (no implementation is authorised)

### I1. Already built
**On main** (founder plus one test account):
- typed Tell, with several people per story;
- who-is-who questions, vague dates, told-again for residence;
- sources on every line;
- a yes for sensitive readings;
- Undo, correct, move, forget;
- Today with one deterministic Moment (events, follow-ups, birthdays, milestones, good news, first days);
- hand-off to Messages, Phone or WhatsApp, with "You could mention";
- return check → "anything worth remembering?";
- the Between-you trail;
- consent naming the provider; SQLCipher on device.

**In alpha** (unmerged, undeployed, never on a device):
- promise and open-thread Moments, with the promise loop;
- one private notification (delivery unverified);
- Ask v1 (word matching);
- export, account deletion, merge duplicates;
- Pause and Remembered;
- long notes up to 200 items;
- the Electric Garden visual system.

### I2. Justified near-term work (proposals; each needs the founder's go)
1. **Distribution first.** An App Store Connect record, TestFlight, and the alpha release sequence with founder approval. Without it, none of §H can run and no differentiator can be validated.
2. **Close the hygiene gaps competitors already meet:** export, account deletion and a working notification on the shipped build. These are already in the alpha.
3. **Strengthen the loop that is the reason to return (H2):** promise and thread Moments on a device, plus the after-contact prompt. Measure Moment supply per user: how many weeks have a non-birthday Moment.
4. **Make trust felt, not explained (H1):** improve recall, since Ask's paraphrase misses undercut "it remembers exactly", and reach the general told-again case (K18). This is a direction for a brief, not a spec.
5. **The structural design choice from PR #76, informed by §G,** made alongside steps 1–3, not ahead of them.

### I3. Longer-term opportunities (all hypotheses; some touch contract rules)
- **A user-declared intention** as the only form of time-based nudge. Founder decision F1, after Test 2.
- **Voice capture on the device** (D5). Founder decision F2, after Tests 1 and 2.
- **Ambient surfaces** (a widget or Live Activity) as the low-attention form of Today. Supported by the ambient-visibility evidence. The widget is currently held.
- **Help beyond a nudge:** practical care, plans, connecting people (CC-28). Only after H2 proves the loop. Never a marketplace (contract §2).
- **Semantic recall with bounded synthesis** (after Ask v1). Never chat as a primary surface.

### I4. Watch list
These are the competitor moves that would most change this analysis:
- Dex or Mesh pointing passive capture at close relationships.
- Apple adding per-person memory or proactive moments to Siri and Contacts.
- Gemini Contacts reaching general availability with event-based suggestions.
- Keep adding source tracing or consumer positioning.
- Monica v3 launching with AI.
