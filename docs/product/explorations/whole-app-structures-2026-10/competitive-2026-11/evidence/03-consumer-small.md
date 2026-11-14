# 03 — Small consumer apps for friends and family (keep in touch, remember details, gifts, "be a better friend")

Research date: **1 Nov 2026**. Status: **not hands-on.** No accounts were created, nothing was installed, and no data was entered. Everything below comes from public listings, product sites, forums and reviews.

## Method and evidence conventions

- **App Store facts** (rating, rating count, version, current-version date, first-release date, price, seller, description, release notes, screenshot URLs) come from Apple's public iTunes Lookup and Search APIs (`https://itunes.apple.com/lookup?id=<id>&country=us`). They were cross-checked against the US listing page `https://apps.apple.com/us/app/id<id>`, which supplied the in-app purchase (IAP) price lists, the privacy-label category and the version history. All were seen on 2026-11-01. Ratings are **US storefront only**.
- **App Store reviews** come from Apple's public customer-review RSS feed (`https://itunes.apple.com/us/rss/customerreviews/id=<id>/sortBy=mostRecent/json`), seen on 2026-11-01. The feed returns only the most recent ~50 reviews per app.
- **VERIFIED** means it was observed in a primary source: a store listing, the store's own metadata, or the developer's site or release notes. **MARKETING CLAIM** means it is the developer's description of benefits or behaviour that cannot be checked without hands-on use.
- **Availability labels:** *Active & GA* means updated within 12 months and publicly downloadable. *Early* means one release or almost no ratings. *Dormant* means no update for more than 12 months (before 2025-11-01). *Discontinued/broken* means there is evidence the service no longer works.
- **Screenshot URLs** are Apple CDN (mzstatic) links taken from the listing metadata. The screenshot *file names* chosen by developers are quoted when they reveal the screen's purpose (for example `01_last_connected_map.png`). The images themselves were not viewed.
- Reddit could not be searched (the domain is blocked to this research agent's crawler). User-sentiment evidence therefore comes from Hacker News (via the Algolia API), App Store reviews and Product Hunt.

---

## Part A: Named products, resolved

### A1. Keepsake — **no friends-and-family keep-in-touch app by this name found**
Four different "Keepsake" products exist. None is a keep-in-touch or remember-people app:
- **Keepsake: Remember everything** (Shreyas Rajapurkar) is a general capture app for reminders, memories and routines. Its support page says data is stored locally and voice transcripts go to Google's Gemini API. Seen at https://sites.google.com/view/keepsake-help/ and https://sites.google.com/view/keepsake-privacy-policy/ (2026-11-01, via search summary; App Store id not resolved).
- **keepsake.place** (Nicolas Croce) is a notes, tasks and journaling tool whose notes "can link to people and projects". It is SaaS: 30 days free, then €9/month or €89/year according to its own description, while AlternativeTo shows $7–9/month (the figures conflict). It was added to AlternativeTo on 2026-02-17. Source: https://alternativeto.net/software/keepsake/about (2026-11-01). It is not a dedicated people app.
- **Keepsake – Alarm for buddies** (Quad SoftTech) is shared alarms. Its last update was 2019-07-31, so it is **dormant**. Source: https://apps.apple.com/us/app/id995209025 (2026-11-01).
- **Keepsake (letters, 2021)** was a Show HN for sending audio and video letters: https://news.ycombinator.com/item?id=27446986. Its status is unknown and was not verified.

**Verdict:** Not found as a competitor. The closest real products in this space are *remember them*, *FriendVault* and *Hippo* (below).

### A2. Hippo – Personal CRM (Roel van der Kraan / Studio Skipper) — **Active & GA**
- **Store data (VERIFIED):** https://apps.apple.com/us/app/hippo-personal-crm/id1458330948. Version 2.2.0 dated 2026-10-27; first released 2019-07-22. Rated 3.0 from **8** US ratings. Free with IAP: Monthly $1.99, Yearly $13.99 or $14.99, Lifetime $29.99. Privacy label: "Data Not Linked to You". Runs on iPhone, iPad, Mac and Vision.
- **Free-tier conflict:** The listing says "free to try with up to 25 contacts". The site https://gethippo.app says it is free to try for one month, then $14.99/year or $29.99 lifetime (both seen 2026-11-01). The two sources differ.
- **Adding people:** manually. Access to iOS Contacts is optional ("no Contacts access required", per the listing and site).
- **Capture:** typed notes such as kids' names, a new job or gift ideas. Version 2.1 and 2.2 added **Siri voice capture**, for example "add a note about Natalie to Hippo" and "What did I note about Chloé?". On iOS 27 this works through Apple Intelligence (VERIFIED in the release notes on the listing). It is voice-to-command, not free-form understanding.
- **Structure:** Notes, Events, Relationships and Reminders. Contacts can be linked to each other (partners, siblings, colleagues), and the listing says you can "see at a glance how the people in your life connect" (MARKETING CLAIM about the visual).
- **Bringing things back:** event-driven ("Get reminded so you can ask about it next time") plus to-dos such as "questions you want to ask the next time you meet". There is no cadence engine in the description.
- **Visual:** contact list and profile. The iPhone Duo release shows "contacts and their details side by side".
- **Privacy:** no account and no servers; sync through the user's own iCloud (MARKETING CLAIM, consistent with the privacy label).
- **Complaint (2026-06-18, 2★):** "App has a habit of crashing, you can't re-order reminders… everything besides birthday is up to you to write in notes". This points to a high manual-maintenance burden. Source: review RSS for id1458330948.
- **Target:** individuals for friends, family *and* colleagues. The Siri examples mention "call Vincent about the invoice".

### A3. Poppy: Connection Keeper (seller Deepa Lokwani; Show HN by "mahirhiro") — **Active & GA, young**
- **Store data (VERIFIED):** https://apps.apple.com/us/app/poppy-connection-keeper/id6759696906. Version 1.5.0 dated 2026-08-21; first released 2026-03-03. Rated 5.0 from **4** ratings. Free with **no IAP**. Privacy label: "Data Not Linked to You". Site: https://poppy-connection-keeper.netlify.app/ (2026-11-01). The site claims a Google Play version. A third-party write-up says Android is waitlisted. Android availability is **not verified**.
- **Metaphor (VERIFIED in the listing):** "a living garden view of your relationships. As you check in, your garden blooms. If someone is overdue, Poppy gently nudges you." The HN thread confirms flowers, seeds and butterflies in the garden UI: the maker says "On the garden in the app try holding on a flower/ seed or click on a butterfly" (https://news.ycombinator.com/item?id=47257352). The site does not say how plant state is computed.
- **Adding people:** import from Contacts and "pick the relationships you want to prioritize". The site recommends starting with 5–10 people.
- **Capture:** after a call, text or meetup you log a check-in by hand and can add a note. Per-relationship notes were added in v1.4.0 (version history). There is **no natural-language or voice capture**.
- **Bringing things back:** **cadence-based**: a per-person weekly, monthly or custom schedule plus a preferred reminder time. Snooze and per-person mute exist, per the maker on HN.
- **After contact:** "Log check-ins in seconds".
- **Streaks — internal contradiction:** the listing says "Track streaks and activity to build better consistency". The site says "without streak pressure". Version 1.5 release notes add sorting by "least recently contacted".
- **Export:** "Export your data when you want" (listing). Data stays on the device by default, and anonymous analytics can be turned off.
- **User reactions (Show HN, 2026-03-05, 179 points / ~125 comments):** https://news.ycombinator.com/item?id=47257352
  - Positive: "Once I installed this app, I pinged some folks, had a great unexpected call and now my garden is growing" (marvin-hansen). Another commenter liked "no social pressure" and starting with a small subset of contacts, and wanted check-ins to start "from the 'flower' in the garden" (edelans).
  - Metaphor is gender-coded: "not well suited (in terms of visuals, name, language) to some of the audiences that need it most. A version that resonates more with middle aged men… Oak or something" (jonners00).
  - Gamification feels wrong: "i kinda dont like the core concept of gamifying socialization. Its weird" (samrus).
  - Reminder fatigue: "the novelty usually wears off after a while and the reminders start feeling like noise" (swaminarayan). The maker answered with snooze and mute.
  - Category saturation: "a neat idea that has been tried about 300 times over… people that install it aren't going to [be the] people that need to be using it" (dvt).
  - Pricing-driven abandonment of rivals: "slick alternatives that I abandoned due to their… insane pricing models, like 'add a few friends for free, then… $20/mo!'" (kstrauser).
  - Doubts about the premise: "If I don't remember or feel like calling someone, I don't… I don't understand the purpose of this app" (AdrianB1).
  - Sustainability: worry the maker will "lose interest… without a business model" (seism).

### A4. Dunbar — **two live apps use the name (both small); a 2019-era "Dunbar" contact app could not be resolved to a listing**
**(a) The Dunbar App (Ryan Holmes, "Made in Canada") — Active & GA, very early**
- https://apps.apple.com/us/app/the-dunbar-app/id6785679511. Version 1.5.0 dated 2026-08-25; first released 2026-08-05. **0** ratings. Free with no IAP. Privacy label: "Data Not Collected". Site: https://thedunbar.app (2026-11-01). Runs on iPhone and Mac; the site says Android is "coming soon".
- **Metaphor (VERIFIED in the listing and site):** four or five **concentric circles**: Inner 5 weekly, Close 15 monthly, Friends 50 quarterly, Network 150 yearly. The listing says it "Visualizes your whole social world as concentric circles". The Mac app shows the circles as columns of photos with last-contacted times.
- **Map:** the site describes a **"Where map"** of where friends live, and one listing screenshot is named `01_last_connected_map.png`. This is the closest existing analogue to an *Atlas* direction.
- **Bringing things back:** a "rhythm engine" compares time since the last touchpoint against the circle's rhythm and surfaces "a short, honest list of who's actually due… not a guilt-driven streak" (MARKETING CLAIM). It also suggests circle placement from meeting frequency.
- **People:** quick logs plus optional Contacts and Calendar import (Google Calendar read-only). Version 1.5 added **Shared Circles** ("share a circle… pool everyone's contributions"). The site also mentions a unified iMessage, SMS and WhatsApp inbox and an "AI assistant" that can ask a contact for their birthday (MARKETING CLAIM; not verified).
- No user reactions found (0 ratings).

**(b) HeyDunbar (Torben Schelin) — Early (single release, 0 ratings)**
- https://apps.apple.com/us/app/heydunbar/id6757140953. Version 1.0 dated 2026-01-12, the only version. **0** ratings. IAP: Premium $9.99/month, $59.99/year. Privacy label: "Data Linked to You".
- **Capture (MARKETING CLAIM):** "Speak your thoughts—Dunbar transcribes them instantly. … Snap a photo and let AI extract the details." Organised into "Inner 5, Close 15, broader 150". "Dunbar tracks **relationship health**". This explicitly quantifies relationships.
- Screenshot file names: `01_Person`, `02_Idea`, `03_Action`, `04_Memory`, `05_Scale`.

There are also *DunbarSocial* (a social network capped at 150 following) and *Dunbar App* (micro-questions for researchers). Both are unrelated. A 2019 Humane Tech community post mentions a "Dunbar contact app" (https://community.humanetech.com/t/dunbar-contact-app-that-helps-you-take-charge-of-you-relationships/4464). No current listing for it was found; its status is unknown.

### A5. hey! / "Hey Friend" — **resolved to "Hey! – Stay in Touch" (Philipp Tschauner) — Active, very early**
- https://apps.apple.com/us/app/hey-stay-in-touch/id6738916276. Version 1.2.2 dated 2026-02-24; first released 2025-01-27. **0** ratings. IAP: **notification "personalities" at $2.99 each** (Therapist, Passive-Aggressive, Gen Z, Boomer, Motivational) or Unlock All for $7.99. Privacy label: "Data Linked to You". Privacy policy is on 5stories.app.
- **Cadence:** every 3, 7, 14 or 30 days, plus an optional "Smart Assistant". Includes **streaks**, monthly and all-time stats, a **calendar view of "your friendship habits"**, per-friend notes and memories, and birthday reminders.
- **Guilt as a paid feature (VERIFIED in the listing):** "Passive-Aggressive — Guilt-trip included (you asked for it)". "Whether you want a sweet nudge or a full-on guilt trip — we've got you."
- "HeyFriend – Talk & Learn" (id6756453539) is a different, unrelated app.

### A6. Catchup — **two different apps**
**(a) CatchUp: Keep in Touch (Ryan Token) — Active & GA**
- https://apps.apple.com/us/app/catchup-keep-in-touch/id1358023550. Version 3.3.0 dated 2026-10-24; first released 2018-05-17. Rated **4.62 from 47**. Free with no ads; only IAP is a **tip jar** ($0.99, $1.99, $4.99). Privacy label: "Data Not Collected". Requires iOS 26.
- Pick people from iOS Contacts, then set a daily, weekly, monthly, quarterly, annual or custom cadence and a time of day. Birthdays and anniversaries come from Contacts. Features "**A grid of your upcoming catchups**" and "Unread indicators for contacts it's time to CatchUp with". It is a pure reminder app with **no memory capture** described.
- Complaint (2025-02-03, 3★): "Very rigid configuration… no ability to search contacts".

**(b) Catchup: Friendship Tracker (Chris Lee) — Dormant (last update 2024-12-22)**
- https://apps.apple.com/us/app/catchup-friendship-tracker/id6450726946. Rated **4.35 from 82**. Catchup Plus costs $9.99. Free tier is limited to **2 contacts** with reminders paywalled. Privacy label: "Data Not Collected". Site: https://www.getcatchup.app/.
- Reviews (RSS, 2026-11-01):
  - Praise for not nagging: "Helpful Without Being Naggy - Perfect" (2023-10-21).
  - Paywall complaint: "Useless without paying… only lets you track your catchups with 2 friends" (2025-03-25).
  - Broken basics: "Can't add friends… I'd like a refund" (2026-06-02); "Unable to add contacts" (2025-10-28).
  - No sync: "doesn't sync across devices" (2024-11-03).
  - Garden abandoned: "The first one I came across was Garden - but that seems to now be abandoned, and is unstable" (2024-11-13).

### A7. Ping — **resolved to "Ping – Stay In Touch" (Pad19 Labs) — Active, very early**
- https://apps.apple.com/us/app/ping-stay-in-touch/id6746456926. Version 1.3.0 dated 2026-05-25; first released 2025-06-26. Rated 5.0 from **1**. Free, no IAP. Privacy label: "Data Not Collected". Presented as an "experiment" at https://pad19labs.com/experiments/ping.
- Offers "Smart reminders", notifications "when too much time has passed", and "Keep track of who you've pinged and what you talked about". The v1.3 release notes say "Improved follow up flow to capture the details of interactions". Screens are named `home`, `interact` and `friend`.
- Unrelated: *Ping Friends* (YMMV LLC), *Ping: social map*, *Ping! – Real people. Your pace*.

### A8. "Stay in Touch" — **generic name; several apps**
- **Stay In Touch – Keep In Touch** (Sick App Developers GmbH): https://apps.apple.com/us/app/stay-in-touch-keep-in-touch/id1645025909. Version 1.0 dated 2022-10-01, the only version, 0 ratings, so **dormant**. Distinctive feature: **saved, reusable message templates** shared straight to WhatsApp ("contact them in just four clicks from the moment you received the reminder").
- **Stay In Touch: SoonCall** (Mark Houghton) — **Active**: https://apps.apple.com/us/app/stay-in-touch-sooncall/id6470842756. Version 1.11.1 dated 2026-10-25; first released 2024-06-30. Rated 5.0 from 2. Many IAP tiers: Pro monthly $6.99, annual $39.99, unlocks $2.99 / $29.99 / $39.99, and an "Early Bird – Lifetime" for $99.99. Privacy label: "Data Linked to You". Offers "Smart Suggestions" based on habits, birthdays and reminder settings, call tracking, and notes ("Most friendships don't end. They fade.").

### A9. Friendly — **not found** as a keep-in-touch app
- "Friendly Reminders" (Carroll Morris, id6749191293) sends email and SMS reminders *to other people*, for households, teams and clubs. It is out of scope.
- "Friendly Social Browser" is a Facebook wrapper and unrelated.
- Nearest in-scope app: **FriendVault** (see B3).

### A10. Bond — **resolved to "Bond: Keep in Touch" (Rooftop Moments UG) — Active & GA, no US ratings**
- https://apps.apple.com/us/app/bond-keep-in-touch/id6453560385. Version 1.4 dated 2026-06-02; first released 2024-01-11. **0** US ratings. IAP: Lifetime $8.99, Yearly $3.99, with a 7-day trial; after the trial it "goes **read-only** rather than locking you out". Privacy label: "Data Not Linked to You". Local SwiftData storage with **JSON import and export**.
- **Distinctive choices (VERIFIED in the listing):**
  - Overdue friends show **soft fuzzy dates** ("Late March", "Mid-March") instead of red badges.
  - An **Inspiration tab** offers one activity idea per day (~150 ideas, such as "Stargazing with a thermos"), paired with the most-overdue friend. This is an action beyond a reminder.
  - A **Network tab** is a "force-directed social graph", with **five tiers** (Intimate, Close, Trusted, Acquainted, Casual) and a "friendship status quiz".
  - Positioning: "Not a CRM… does not care about… your last-contact notes."
- **Historic namesake:** "Bond" at getbond.co (2015, GeekWire App of the Week: https://www.geekwire.com/2015/app-of-the-week-bond-helps-you-stay-in-touch-with-friends-and-family/). It was mentioned in the 2017 Monica HN thread ("its interaction wasn't designed very well"). Its current status was not verified.

### A11. Nudge — **ambiguous; no single product**
- **Nudges: Staying Connected** (Nick Batchelder) is the closest match: https://apps.apple.com/us/app/nudges-staying-connected/id6757097089. Version 5.2.2 dated 2026-08-29; first released 2026-01-16. Rated 3.67 from 3. Free. Mechanic: "**Spin the wheel** to choose someone to reconnect with… let Nudge decide". Also offers groups and "thoughtful message starters".
- **Nudge: Cadence Reminders** (STONEG) is general recurring chores and out of scope.
- Other name-alikes with 0–2 ratings: Contact Nudge, Nudge Circle, Nudge Now, Nudge Tap.
- **Nurture** (2020 Show HN, read WhatsApp and Messenger to auto-detect contact) is historic; status not verified: https://news.ycombinator.com/item?id=24192310.

### A12. Plum / "Remember" — **"Plum" not found**
- No people-memory app named Plum appeared in App Store search or web search (2026-11-01).
- "**Remember•**" (子捷 陈, id6742531818) is a **memorial "memory palace" for deceased family, pets or objects**. Version 1.0 dated 2025-03-27, 0 ratings, so **dormant**. It is a different use case, though notable because it also uses a "palace/place" metaphor.
- The closest live match to "Remember" is **remember them: People Notes** (see B1).

### A13. Garden: Stay in Touch (Meaning Labs, Inc.) — **Dormant since 2020; effectively broken**
- https://apps.apple.com/us/app/garden-stay-in-touch/id1230466454. Version 1.1.8 dated **2020-06-04**; first released 2018-03-29. Rated **3.92 from 50**. Free, no IAP. Privacy label: "Data Linked to You" (requires an account). Launch coverage: TechCrunch 2018-04-10, https://techcrunch.com/2018/04/10/a-new-app-called-garden-helps-you-stay-in-touch-with-friends-and-family-without-facebook.
- **The name is the only "garden".** Per the listing it is a list and notification app: "Reminder to reach out to Jane S. (it's been 3 months)."
- Reviews (RSS):
  - Server failure: "unable to log in OR reset my password with the app citing server issues" (2024-04-16); "stopped working today… data is only stored on the server" (2024-04-09).
  - Account friction: "Why is an account needed?" (2020-03-14).
  - Contacts permission: "The allow contacts is invasive" (2018-05-16).
- No formal shutdown notice was found. It is still listed, but reviews indicate the backend fails. Treat it as **discontinued in practice (inferred, not announced)**.
- **Lesson:** server-dependent personal data plus a dormant developer led to user lock-out.

### A14. Lunatask — relationships module (Michal Krejci) — **Active & GA**
- https://apps.apple.com/us/app/lunatask-a-better-to-do-list/id1583719331. Version 2.36.1 dated 2026-07-14; first released 2021-09-06. Rated 4.43 from 103. Premium costs $8/month or $72/year. Privacy label: "Data Linked to You", with end-to-end encryption claimed on the site. Runs on iOS, Android, Mac, Windows and Linux.
- **Relationships (Lunatask 2, VERIFIED in release notes and site https://lunatask.app/):** "Relationship Tracking, our take on a Personal CRM featuring fully customizable fields, beautiful **hierarchy visualization**, **reconnect rules**, and **memories timeline with journal integration**". The site says "Timeline of Happy Memories You Share" and "CRM but for Your Personal Life". The free plan includes **30 relationships**.
- No relationships documentation page was found; lunatask.app/relationships returned 404 on 2026-11-01. The shape of the hierarchy visual is **not verified**.
- User evidence: a third-party listing quotes an App Store reviewer saying memory entries "help boost my mental health… call out the highlights of my life as I scroll back" (via search summary; original review not located).
  - A 2026-10-06 review: "includes a simple CRM to help you keep up with friends".
  - Complaints are about general complexity, not relationships: "Maybe I am too old… can't figure out to get started" (2026-01-09).
- **Target:** productivity and ADHD users. Relationships are a sub-module of a planner, not the core.

### A15. Gift apps (Giftful, Elfster) — **out of scope: they store your own wishlists, not memories about other people**
- **Giftful** (https://apps.apple.com/us/app/giftful-wishlist-registry/id1450175505): 4.84 from **103,018**, updated 2026-11-01. A universal wishlist and registry with private claiming ("surprises safe"). It does not keep per-friend memory notes (VERIFIED from the description).
- **Elfster** (https://apps.apple.com/us/app/elfster-the-secret-santa-app/id751594890): 4.87 from **331,926**, updated 2026-10-21. Secret Santa draws plus your own wishlists. Does not store memories.
- In-scope gift-memory apps that do store information about others:
  - **GiftPlanner** (Andrew Milham, id479882306): "Track your contacts' wish lists and interests". Rated 4.57 from 792. Last update 2022-12-19, so **dormant**.
  - **Tend** and **remember them** both keep per-person gift-idea lists (below).
  - **Giftly** (Seempl Studio, id6762543293): gift lists, mostly self-wishlists, now with shared lists. Rated 3.0 from 2. Active.
- **Takeaway:** scale in gifting comes from social wishlists (other people declare what they want), not from remembering. No gifting app with more than ~1,000 ratings found keeps a private memory of what a friend mentioned.

---

## Part B: Independently discovered apps active 2024–2026

Search terms used on the US App Store (2026-11-01): "keep in touch", "remember friends", "friend reminders", "relationship journal", "people notes", "stay in touch", "friendship tracker", "remember people", "personal crm friends", "friends journal", "friend garden", "birthday gift ideas people". The long tail is very crowded: more than 40 apps launched in 2026 alone, most with 0–3 ratings. The apps below were selected for relevance or traction.

### B1. remember them: People Notes (Marvin Blase, Aachen) — **Active, early** — *closest to "understanding" capture*
- https://apps.apple.com/us/app/remember-them-people-notes/id6756941740. Version 1.24.4 dated 2026-07-26; first released 2026-05-08. **0** US ratings. IAP: Pro $0.99/month or $9.99/year, plus tips of $0.99 and $3.99. Privacy label: "Data Not Linked to You". Requires iOS 26. Site: https://www.rememberthem.app.
- **Capture (VERIFIED in the listing):** "JUST TYPE ONE SENTENCE… 'Met Ben at the conference – two kids, loves hiking, birthday June 12'. The AI understands who you mean, **splits it into separate memories**, sorts them into categories, adds tags and suggests a yearly reminder when it spots a date. **You review, tap save**."
  - The site says the AI is opt-in and uses OpenAI's API. The free plan allows 3 AI detections per day.
- **Structure:** 13 categories (Loves, Dislikes, Family, Allergies, Wishes, Pets, Gifts and others), a **journal timeline per person**, a calendar of upcoming dates, user-named **Lists** to group people, and full-text search. JSON export (site).
- **Traction signal:** release notes say "closing in on 1,000 memories saved". This is total memories across all users, which indicates very small usage.

### B2. Tend: Stay Close to Friends (Christopher Turgeon) — **Active, early** — *explicit anti-quantification*
- https://apps.apple.com/us/app/tend-stay-close-to-friends/id6759920053. Version 1.0.10 dated 2026-09-29; first released 2026-04-24. Rated 5.0 from 2. Premium IAP $1.99 / $19.99. Free tier: 10 contacts. Privacy label: "Data Not Collected". Site: https://usetend.org.
- Per-person cadence and **AI-drafted messages** in your tone (on-device for Premium), sent through iMessage or WhatsApp. Also offers scheduled messages ("Tend never sends a message for you"), **gift-idea lists per person**, and a "Names" tab for people you just met.
- **Insights (VERIFIED in the listing):** "the shape of your last twelve weeks… a thread for each person, and the moments worth remembering. **No scores, no counters, no streaks** to keep alive."
- After logging a reach-out, a **"You're caught up" card** appears (v1.0.10 release notes). This is a finite end state, similar to the Moment Deck direction.
- Screenshot names: `Never`, `Send_the`, `See_How_You`, `Every_Detail`, `Your_Inner_Circle`, `Remember`.

### B3. FriendVault: Friends Journal (Coast Solutions OÜ) — **Active, early** — *journal metaphor*
- https://apps.apple.com/us/app/friendvault-friends-journal/id6759299538. Version 1.2.111 dated 2026-10-25; first released 2026-02-23. **0** ratings. **$2.99 one-time** unlock. Privacy label: "Data Not Collected".
- Described as "a private journal for your friends and family". You write a line or two after contact; "next time, FriendVault shows you what you talked about"; group dinners can be logged once for everyone. Gift ideas track "from first spark to wrapped". Includes birthdays with age and a widget. Cadence can be weekly, monthly or every few months. Backups are AES-256 encrypted with a user PIN.
- Release notes: "Profiles are now one page: what's coming up, notes and your shared journal"; "See what you talked about last time while you write".

### B4. Buddies: Friendship Tracker (Hbrothers L.L.C.; listing also says "Bloomie") — **Active, early** — *flower garden*
- https://apps.apple.com/us/app/buddies-friendship-tracker/id6763259286. Version 1.02 dated 2026-08-05; first released 2026-04-28. Rated 4.33 from 3. IAP: **$9.99/month or $39.99/year** after a trial. Privacy label: "Data Not Linked to You". Product Hunt: https://www.producthunt.com/products/buddies-friendship-tracker (4 upvotes, #98 of the day).
- **Metaphor (VERIFIED in the listing):** "every friend becomes a **flower that grows when you show up, and slowly fades when you do not**". Includes a "Memory Thread" timeline per friend, "Care Rhythm" cadence, and "Time Sensitivity" (how fast each friend fades).
- **User reaction (App Store, 2026-06-30, 5★):** "Love these little flowers and **don't want to get them to die** :( so I text my little friends every now and then!" The metaphor works by loss-aversion.
- Maker on Product Hunt (Thibault Mundele): spreadsheets and reminders failed because "it felt like a task". The PH page shows "No reviews yet".

### B5. Touchpnt: Friendship Tracker (Touchpnt LLC) — **Active & GA** — *hard gamification*
- https://apps.apple.com/us/app/touchpnt-friendship-tracker/id6760320698. Version 2.2 dated 2026-10-21; first released 2026-07-16. Rated **5.0 from 55**. IAP: $4.99/month, $39.99/year, $89.99 lifetime. Free tier: 5 contacts. Privacy label includes "Data Linked to You". Available on iOS and Android per https://touchpnt.io.
- An otter mascot ("Otty"), **streaks**, **36 badge tiers** ("Jenny" at 867), "Clams" that shield streaks, colour-coded overdue dots, an app-icon badge count, an activity chart, and a Question of the Day. Distinguishes Personal from Business contacts.
- **Explicit loss framing (VERIFIED):** "**When you have something to lose, you'll pick up the phone.**"
- Reviews are overwhelmingly positive ("The gamification is tastefully done and I just love my little otter", 2026-10-03). However, about 10 five-star reviews landed on 13–14 Aug 2026, one of them off-topic. Treat the rating as **possibly launch-seeded (unverified)**.

### B6. Fabriq: Stay in Touch (Sowlutions Inc.) — **Active (updated 2026-10-16) but with abandonment complaints**
- https://apps.apple.com/us/app/fabriq-stay-in-touch/id1460143202. Version 3.4.8; first released 2019-04-22. Rated **3.96 from 165**. IAP: All Access $4.99/month or $39.99/year. Privacy label: "Data Linked to You"; account plus SMS verification. Also on Google Play (com.ourfabriq).
- **Dunbar-style circles**, up to 150 people. "Keep tabs on how often you connect and the **quality of those connections over time**" (quantifies relationships). Conversation starters ("Meme or heartfelt message?").
- Reviews (RSS):
  - Circles liked: "Love the circles concept" (2020-07-22).
  - App-launcher look liked: "Nag notifications… I love that it's designed like an '**app launcher**.' Dead simple" (2019-09-26). This is a grid-of-faces precedent, relevant to the *Wall* direction.
  - Too busy visually: "now it's so colorful that it's hard to see" (2021-03-22).
  - Wants user-defined groups: "if there were a way to have custom circles, groups or even tags… I would subscribe right now" (2021-11-14).
  - Abandonware and privacy: "Poor privacy, unresponsive developer, and abandonware… tracking EVERYTHING… price… ridiculous" (2025-06-08).
  - Broken payment: "Cannot pay for all access" (2026-08-31).
  - Spam: "Wayyy too Spammy!" marketing email (2020-09-24).

### B7. Linc – Friendship Tracker (BitLark LLC) — **Active (2026-01-04)**
- https://apps.apple.com/us/app/linc-friendship-tracker/id1513780616. Version 2026.1; first released 2020-07-06. Rated 4.16 from 56. IAP: $14.99/year or $69.99 lifetime. Privacy label: "Data Not Linked to You". Site: https://getlinc.app.
- Tracks "when you last spoke, what you talked about, and even **where you met**". Offers "**health indicators** and engagement stats" (quantifies), conversation starters, and themes and layouts.
- Reviews:
  - Positive: "Address Book with Heart… made me a better friend" (2025-10-24).
  - Price: "Pricing seems off" (2020-12-29).
  - Wants auto-logging: "would love it if it could automatically update 'last contact' date by checking my message and call history" (2022-01-01).

### B8. Revere – Remember People (Revere Inc.) — **Active (2026-10-18)** — *remember-details, oldest in set*
- https://apps.apple.com/us/app/revere-remember-people/id1260429188. Version 4.16; first released 2017-10-05. Rated **4.72 from 110**. Premium $4.99/month or $49.99/year.
- Notes, journals and reminders about people you meet, with relationship fields.
- Reviews:
  - **Price complaints across 2019–2021:** "$5/month turns me off"; "subscription too expensive".
  - Login wall: "you have to give up your name and email in order to even look at it" (2020).
  - Not inclusive: "binary… without much room for LGBTQ identifiers" (2020, 2022).
  - **Map request (2019-08-21):** "a tab for being able to see all my saved friends cities on a **map**… go to a city and pull up all the profiles there". This is direct demand evidence for an *Atlas* direction.

### B9. Amato: Friendship Tracker CRM (Anika Schober) — **Dormant (last update 2024-03-25)**
- https://apps.apple.com/us/app/amato-friendship-tracker-crm/id1614085893. Rated 4.6 from 75. Pro Lifetime $34.99. Privacy label: "Data Not Linked to You". Interaction log (call, message, meeting, email) with notes. **Home Screen and Lock Screen widgets** (screenshot `Lock_Screen_widgets.jpg`), a precedent for the Lock Screen surface.

### B10. Check Up: Keep Friends Close (Ginkgo Labs) — **Dormant (last update 2025-07-08)**
- https://apps.apple.com/us/app/check-up-keep-friends-close/id6503481803. Rated 5.0 from 12. Premium $1.99/month or $9.99/year. Free tier has a contact limit. Privacy label: "Data Not Linked to You".
- Reviews show an ADHD and long-distance audience: "Great for ADHD" (2024-09-28); "best thing for long distance besties" (2024-09-16).

### B11. Kairo – Postcard Journal (Minjoon Eom) — **Active, early** — *postcards and a weekly reveal (social, not a tracker)*
- https://apps.apple.com/us/app/kairo-postcard-journal/id6788220408. Version 1.4.0 dated 2026-09-29; first released 2026-08-04. Rated 5.0 from 11. Free. Privacy label: "Data Linked to You". Site: https://www.gettingkairo.com/.
- One weekly question; you answer with up to 3 photos and "a note on the back, like a **postcard**". "Nobody sees anything until Thursday, when everyone's week opens at once. It feels a lot like getting mail." Screens include `world-grid` and `profile-archive`, and badges were added in v1.4.
- Reviews: "get hella excited every Thursday morning" (2026-09-10); "hidden until the end of week" (2026-09-29).
- It is not a keep-in-touch tracker, but it is the market's clearest **postcard** and **finite reveal** precedent.

### B12. Monica (open-source personal CRM, web) — **Active development; no stable release since 2024**
- GitHub https://github.com/monicahq/monica (via `gh api`, 2026-11-01): 25,560 stars, last push 2026-10-28. The latest tagged releases are v5.0.0-beta.5 (2025-04-21) and stable v4.1.2 (2024-05-04). Described as "Remember everything about your friends, family and business relationships."
- The **canonical "tracking friends feels creepy" debate** happened in its 2017 Show HN (1,097 points): https://news.ycombinator.com/item?id=14497295. See Part D.

### Also seen (thin evidence, listed for completeness)
- **Garland: Keep in Touch & Notes**, id6783643143 (v2.0.0, 2026-08-11, 0 ratings)
- **Undrift**, id6759453940 (v2.0, 2026-10-13)
- **Kade: Keep in Touch, Birthdays**, id6808796088 (2026-10-27)
- **Orbit: Keep in Touch**, id6759737373
- **In The Loop: Friend Reminder**, id6759206541 (5.0 from 3)
- **Human Hub: Friend Reminders**, id6768231902
- **Friends Log – People Journal**, id6758514335 (v1.3.0, 2026-03-26, 5.0 from 2)
- **Friendex**, **Friendful**, **Remeli**, **MeetMind** ("remember people" apps, 2026, ≤6 ratings)
- **Queue Personal CRM**, id1451429218 (4.4 from 42, updated 2026-10-23)
- **Henlo – Personal CRM**, id1643404410 (3.33 from 6)
- **Wovu** ("Memory Garden" where connections wilt; mentioned in a search summary only, **not verified**)
- **Excluded:**
  - **Folk: friend in texts** (id6800439069, 4.82 from 285) is an AI companion, not a people-memory app.
  - **Dex**, **Clay**, **Covve**, **Contacts Journal CRM** and **Cloze** are networking or business CRMs, covered in other reports.

---

## Part C: Cross-cutting comparison (not hands-on)

| Product | Status (2026-11-01) | Adds people | Capture | Brings things back by | Visual model | Price (US) |
|---|---|---|---|---|---|---|
| Hippo | Active | Manual / optional Contacts | Typed notes; Siri voice commands | Events + to-dos ("ask next time") | List + profile; linked relationships | $1.99/mo, ~$14/yr, $29.99 life |
| Poppy | Active (Mar 2026) | Contacts import | Manual check-in + note | Per-person cadence | **Garden of flowers** that blooms | Free |
| The Dunbar App | Active, 0 ratings | Logs, Contacts, Calendar | Quick logs | Circle rhythm ("due today" list) | **Concentric circles**; **Where map** | Free |
| HeyDunbar | Early, 0 ratings | — | **Voice + photo → AI** | "Relationship health" nudges | Inner 5 / 15 / 150 circles | $9.99/mo, $59.99/yr |
| Hey! | Active, 0 ratings | Contacts | Notes | Cadence (3/7/14/30 days) | **Streaks**, stats, calendar | Voice packs $2.99; all $7.99 |
| CatchUp (Token) | Active | Contacts | None | Cadence + birthdays | **Grid** of upcoming catch-ups | Free + tips |
| Catchup (Lee) | Dormant | Contacts | Notes per interaction | Cadence goals | List | $9.99 Plus |
| Bond | Active, 0 US ratings | Manual | Minimal | Cadence + daily activity idea | Fuzzy-date list; **network graph**; 5 tiers | $8.99 life / $3.99/yr |
| Garden | Dormant/broken | Contacts (account) | Notes | Cadence ("it's been 3 months") | List | Free |
| Lunatask | Active | Manual | Custom fields; **memories timeline + journal** | Reconnect rules | Hierarchy viz (unverified) | $8/mo, $72/yr |
| remember them | Active, 0 ratings | Manual | **One sentence → AI split, user reviews** | Date reminders | **Journal timeline**, categories, lists | $0.99/mo, $9.99/yr |
| Tend | Active | Contacts | Notes; AI-drafted messages | Cadence + birthdays | 12-week "threads", **no scores**; "caught up" card | $1.99 / $19.99 |
| FriendVault | Active, 0 ratings | Manual | Journal lines after contact | Cadence + birthdays | **Journal** per person | $2.99 once |
| Buddies | Active | Manual | Moments + notes | Care rhythm | **Flowers that fade** | $9.99/mo, $39.99/yr |
| Touchpnt | Active, 55 ratings | Contacts | Notes | Cadence | **Streaks, 36 badges**, otter, dots | $4.99/mo, $39.99/yr, $89.99 |
| Fabriq | Active, complaints | Contacts (account) | Notes, reflections | Reconnect goals | **Circles**; "app launcher" grid | $4.99/mo, $39.99/yr |
| Linc | Active | Contacts | Notes, where met | Cadence | **Health indicators**, themes | $14.99/yr, $69.99 life |
| Revere | Active | Manual | Notes, relationships | Reminders | Profiles/journal | $4.99/mo, $49.99/yr |
| Kairo | Active | Friends (social) | 3 photos + note weekly | **Weekly Thursday reveal** | **Postcards**, world grid | Free |

**Patterns (inference from the above):**
1. **Cadence dominates.** About 15 of 18 products decide what to bring back with a per-person or per-tier timer. Only Hippo (events and questions), remember them (dates) and Kairo (weekly ritual) are not timer-led. **None found is driven by what the user actually said about the person** (for example, "her surgery is Thursday, ask how it went"), apart from Hippo's manual "questions to ask next time".
2. **Capture is almost always manual.** Only remember them (typed sentence → AI split → **user reviews before save**) and HeyDunbar (voice and photo → AI, marketing only, 0 ratings) offer natural-language capture. Hippo's Siri support is command-style.
3. **Quantification is common.** Seven of the 18 products in the table quantify relationships: streaks (Touchpnt, Hey!, Poppy's listing), "relationship health" (HeyDunbar, Linc), "quality of connections over time" (Fabriq) and tiers or quizzes (Bond, Dunbar). **Tend** is the only one found that markets "No scores, no counters, no streaks".
4. **Privacy as a selling point is table stakes for new entrants.** Almost every 2025–2026 entrant is local-first, needs no account and offers export. The older server-based apps (Garden, Fabriq) draw reviews about lock-out, abandonment and tracking.
5. **Monetisation is tiny.** Prices range from tip jars to about $40/year, and the paid tier is usually gated by contact count (2, 5, 10, 25 or 30 free contacts). Revere, Linc and Catchup draw recurring complaints that a contact-count paywall or subscription is "too much for the purpose". The largest products in the set have only 47–165 US ratings. **No small consumer app found has meaningful scale.** Gifting reaches scale (100k–330k ratings) only through self-declared wishlists.
6. **Actions beyond reminders** are rare: message templates (Stay In Touch, Fabriq, Linc, Tend's AI drafts), a daily activity idea (Bond), a spin-the-wheel pick (Nudges), a question of the day (Touchpnt) and gift-idea lists (Tend, FriendVault, remember them).

---

## Part D: User reactions — guilt, "tracking friends feels weird", abandonment

**"Feels creepy / weird":**
- Monica Show HN, 2017 (https://news.ycombinator.com/item?id=14497295):
  - "I find this borderline creepy and overengineered" (wink, item 14497679).
  - The creator himself: "A CRM for friends is very explanatory. But I dislike the creepiness of it" (robinhood, 14497776).
  - "Isn't it weird though to put stars on people?" (robinhood, 14498420). This reaction is to *rating* people.
  - "I think calling it a CRM is what's weird" (eddieroger, 14499428).
  - "The word 'manage' has to go… I like the idea of 'cultivating'" (shoover, 14499946).
  - Counterpoint: an uncle who remembered everyone, kept "with a spreadsheet", is remembered as "unbelievably caring" (danielvf, 14498590). Another commenter notes people use the same tool to argue both "you must not genuinely care" and "it shows you genuinely care" (gdfer, 14500057).
- HN, 2018: "I think Monica is creepy as all hell… Putting them on a 'CRM to manage' is like using LinkedI[n]…" (https://news.ycombinator.com/item?id=16360674).
- Poppy Show HN, 2026: "gamifying socialization. Its weird" (samrus); "Is this a CRM for your friends? FRM? FriendsForce?" (bahador). https://news.ycombinator.com/item?id=47257352

**Guilt and obligation:**
- Several products **sell guilt or loss**:
  - Hey!'s "Passive-Aggressive — Guilt-trip included", a $2.99 IAP.
  - Touchpnt's "When you have something to lose, you'll pick up the phone".
  - Buddies' fading flowers. A user complies because "don't want to get them to die".
- Many others **market the absence of guilt** ("No guilt", "zero guilt", "not a guilt-driven streak"): Poppy, Bond, The Dunbar App and Tend. This shows founders see guilt as the category's known failure mode. There is little first-hand user testimony about guilt in reviews; most reviewers are self-selected fans.
- "Nag notifications" is used **approvingly** by one Fabriq reviewer (2019). Catchup (Lee) is praised for being "Helpful Without Being Naggy" (2023).

**Abandonment:**
- Novelty wears off and reminders become noise (swaminarayan, Poppy HN).
- Price: "abandoned due to their… insane pricing models" (kstrauser, Poppy HN). Repeated subscription complaints for Revere, Linc and Catchup (Lee).
- Developer abandonment and server failure: Garden (2024 lock-out reviews; "seems to now be abandoned" in a Catchup review), Fabriq ("abandonware", 2025), Catchup (Lee) dormant with broken purchase and add-contact flows, Amato and Check Up dormant.
- Self-selection: "people that install it aren't going to [be the] people that need to be using it" (dvt, Poppy HN).
- Manual upkeep: Hippo review, "everything besides birthday is up to you to write in notes" (2026). Linc reviewer wants automatic last-contact detection (2022).

---

## Part E: Visual and structural metaphors already in market, mapped to the client's directions

| Client direction | Closest market precedents | User reaction evidence |
|---|---|---|
| **Moment Deck** (full-bleed moment cards that end; Lock Screen) | Tend's **"You're caught up" card** after logging (v1.0.10 notes). The Dunbar App's "short, honest list of who's actually due" each day. Bond's **one** daily activity card. Nudges' **spin-the-wheel** single pick. Kairo's **weekly reveal** (everything opens Thursday). Lock Screen widgets: Amato (`Lock_Screen_widgets.jpg`); Home Screen widgets: Bond, FriendVault, Catchup (Lee). | Kairo: "hella excited every Thursday morning" (positive, n=11 ratings). No full-bleed, finite *moment* deck about a person was found. **Unoccupied.** |
| **Wall** (grid of equal photos in user-named groups) | CatchUp (Token): "A grid of your upcoming catchups". Fabriq: "designed like an 'app launcher'". The Dunbar App on Mac: circles as columns of photos. User-named groups: remember them "Lists", Nudges groups. | Fabriq launcher layout praised as "Dead simple" (2019). A Fabriq user asked for **custom circles/groups/tags** and said they "would subscribe right now" (2021). The later colourful redesign drew "hard to see what's going on" (2021). Grids today are status or overdue grids, not equal-weight photo walls. **Partly occupied** (as a utility grid). |
| **Almanac** (calendar/seasons) | Hey!: "Calendar view of your friendship habits" (habit tracker, with streaks). remember them: "Calendar with everything coming up". Bond: fuzzy month labels ("Late March"). Tend: 12-week rhythm view. Birthday and countdown apps (hip: 4.68 from 17,801; Birthday Countdown: 4.8 from 8,026) are calendar-first but not memory-first. | No reactions found about calendar views. **No seasonal or almanac framing found.** Calendars appear as utility or habit-tracking views. |
| **Atlas** (places/postcards) | The Dunbar App: **"Where map"** of where friends live (screenshot `01_last_connected_map.png`). Linc: "where you met". Kairo: **postcard** journal ("a note on the back, like a postcard… feels a lot like getting mail"). Remember•: memorial "memory palace". | **Demand:** Revere reviewer (2019) asked for "a tab… to see all my saved friends cities on a map… go to a city and pull up all the profiles there". Kairo's postcard ritual reviews are positive. Dunbar's map has no reviews (0 ratings). **Lightly occupied; untested.** |
| **Notebook** (writing page with understanding in the margin) | Journal-per-person: FriendVault ("private journal"; "See what you talked about last time while you write"), remember them (journal timeline; **AI splits one sentence into memories, user reviews**), Buddies "Memory Thread", Lunatask "memories timeline with journal integration", Hippo notes. | Lunatask: memories "help boost my mental health… highlights of my life as I scroll back" (via a third-party quote). Revere: "Great for remembering people… Makes me feel more confident" (2020). Remember-them-style AI capture has 0 ratings. **No product puts understanding in the margin of a page.** AI capture today is a separate review sheet. **Partly occupied** (journals); the margin mechanic is unoccupied. |
| *(Not a client direction, for context)* **Garden / plants** | Poppy (flowers, seeds, butterflies; "garden blooms"), Buddies (flowers that fade), Garden (name only), Wovu (unverified). | Mixed: "now my garden is growing" (Poppy HN). "don't want to get them to die" (Buddies) shows motivation through guilt. Gamification is "weird" (Poppy HN). The metaphor is gender-coded ("Oak or something" for middle-aged men). |
| *(context)* **Rings / circles** | The Dunbar App (concentric), HeyDunbar (5/15/150), Fabriq (circles), Bond (5 tiers + force-directed graph), Lunatask (hierarchy), Tend ("Your Inner Circle" screenshot). | "Love the circles concept" (Fabriq 2020). Users want to define their own circles. Ranking people drew "Isn't it weird… to put stars on people?" (Monica HN). |
| *(context)* **Streaks / badges** | Touchpnt, Hey!, Poppy (listing), Kairo badges. | Touchpnt reviews are positive but possibly seeded. Tend and Dunbar market *against* streaks. |

---

## Part F: Gaps and caveats
- **Not verified:**
  - Android availability for Poppy (site claims Play; a third party says waitlist).
  - The visual shape of Lunatask's hierarchy.
  - HeyDunbar's AI features (0 ratings).
  - Whether Garden's server is fully down today (based on reviews from 2024).
  - The original 2015 Bond's status.
  - Wovu.
- **No walkthrough videos found** for Poppy, Bond, The Dunbar App, Buddies, Tend, remember them or FriendVault. Videos that do exist (not watched):
  - Monica, FOSDEM talk: https://www.youtube.com/watch?v=NPRpb6xkNo8
  - Lunatask general reviews that include a People/Relationships chapter: https://www.youtube.com/watch?v=rFMnqgx4ZGw and https://www.youtube.com/watch?v=xZhXdifynEk
  - Dex first look (business CRM, context only): https://www.youtube.com/watch?v=7-iEQxT3nQg
- Rating counts are US-only. Several apps may have more ratings in other storefronts (Bond is German-developed).
- Touchpnt's 55 ratings show a launch-week cluster of five-star reviews; treat them with caution.

### Screenshot URL index (Apple CDN, from listing metadata, seen 2026-11-01)
- **Poppy:**
  - https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/09/38/eb/0938eb77-a29f-4c91-8b39-68c901c58bc1/Slice_11.png/320x480bb.jpg
  - https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/a9/f1/90/a9f19092-aac0-347e-cd76-aeea976cf39c/Slice_12.png/320x480bb.jpg
- **The Dunbar App:**
  - https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/9d/14/84/9d148486-4b87-9c57-e16d-aa86935b5e58/03_sort_into_circles.png/320x480bb.jpg
  - https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/8a/77/30/8a7730cd-9020-5513-5b94-cb5a7e8a40bd/02_rhythm_at_a_glance.png/320x480bb.jpg
  - The map screenshot is the 4th in the listing (`01_last_connected_map.png`); see the full list via the lookup API.
- **HeyDunbar:** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/fa/36/b2/fa36b2a5-ed8a-0d9b-ccaa-262494ca1786/01_Person_1242x2688.png/320x480bb.jpg
- **Bond:** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/f5/80/d9/f580d97b-75ae-44b2-1e82-4de78fc3c041/02-hero.png/320x480bb.jpg
- **Buddies:** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/7d/5c/b9/7d5cb9c5-83d4-707a-d761-df948a659b86/Frame_482251.jpg/320x480bb.jpg
- **Tend:** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/18/38/e3/1838e3c3-2322-ac01-c975-b6a8c2d76039/screenshot_1_Never.png/320x480bb.jpg
- **remember them:**
  - https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/ec/71/e2/ec71e2c2-1a40-f462-9f73-0bfafa635482/detect.jpg/320x480bb.jpg
  - https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/6b/d5/dc/6bd5dc1e-80ab-8611-2732-c29ec7936639/journal.jpg/320x480bb.jpg
- **FriendVault:** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/16/4c/d2/164cd24e-4c3f-d77f-07f3-0ef830b6f8f8/screenshot-1.png/320x480bb.jpg
- **Kairo:** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/5d/84/16/5d8416c8-2530-007b-09ef-f7183f0e8f8a/03-world-grid.png/320x480bb.jpg
- **CatchUp (Token):** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/a9/03/6e/a9036ecc-2406-9a6d-7aba-0635625cb28d/4146747e-c874-4851-841f-ee5abcc5d8be_iPhone_5.5_U0022_Display_-_Apple_iPhone_13_Mini_5.4-inch_-_Screenshot2.png/392x696bb.png
- **Hippo:** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/63/42/b1/6342b194-e7b6-49f9-6d86-483fcbaf2f70/Apple_iPhone_16_Pro_Max_Screenshot_1.png/320x480bb.jpg
- **Touchpnt:** https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/97/8e/88/978e8815-28d9-f2c9-7455-718ee66fa766/S1.jpg/320x480bb.jpg
- **Amato** (Lock Screen widget is the 7th screenshot): see https://itunes.apple.com/lookup?id=1614085893
- **Garden (2018):** https://is1-ssl.mzstatic.com/image/thumb/Purple123/v4/7e/d9/75/7ed97503-f3bd-2624-cccc-fa31b80b0649/pr_source.jpg/392x696bb.jpg

Raw API dumps and review feeds were kept in the researcher's local scratch space; they are not committed.
