# 02 — Established personal CRMs: competitive findings

Research date: **1 Nov 2026**. Every URL below was seen on 2026-11-01 unless another date is given.
**Method and evidence level.** Everything here comes from docs, store listings and reviews. None of it is hands-on: no accounts were created and no data was entered anywhere. App Store figures come from the live US listing as fetched today. Listings show relative dates ("2d ago"), so some update dates are approximate.
Labels used:
- **[VERIFIED-DOC]**: described in the vendor's own docs, changelog, store release notes or code. This means the feature exists as documented. It does not mean the feature works well.
- **[MARKETING]**: a homepage or launch claim with no doc-level description.
- **[3P]**: a third-party review or comparison. Many personal-CRM "reviews" are written by competitors (Dex, Mesh, Orvo); these are flagged **[COMPETITOR-AUTHORED]**.

Numbers are quoted with who claimed them. No user, retention or revenue figures are invented.

---

## Status table

| Product | Status (1 Nov 2026) | Evidence |
|---|---|---|
| **Monica** (monicahq) | **v1 hosted: registration closed; hosted instance to be deleted end of Dec 2026. v3 (the "Chandler" rewrite, restarted from scratch) is not yet public, promised "before the end of 2026."** OSS repo active. | Notice in PR #7978 (24 Sep 2026); blog "Registration is closed" (26 Oct 2026); GitHub pushes on 28 Oct 2026 |
| **Mesh** (formerly Clay, clay.earth) | Active & GA. Renamed 26 Mar 2026. Owned by Automattic since June 2025. Android launched Aug 2026. Nexus AI in early access. | me.sh/stories/mesh; automattic.com 2025-06-12; TechCrunch 2026-08-12; App Store v2026.7.3 (~30 Oct 2026) |
| **Dex** (getdex.com) | Active & GA; ships AI features fast | Changelog Jan–Oct 2026; App Store v3.79.0 (~29 Oct 2026) |
| **Covve: Personal CRM** | Active & GA, but the company's homepage now leads with B2B lead capture and scanning | App Store v29.8 (~31 Oct 2026); covve.com |
| **UpHabit** | **Appears discontinued** | Both US App Store listings return 404; uphabit.com returns 503. Dex says the apps shut down in April 2026 [COMPETITOR-AUTHORED]. No primary announcement found |
| **Garden: Stay in Touch** | **Dormant/abandoned**: no update since 4 Jun 2020, still listed | App Store version history |
| **folk** | Active & GA, but a **team sales CRM**; no real personal/consumer tier | folk.app/pricing |
| **Cloze** | Active & GA, **pivoted toward real-estate brokerages** (cloze.com redirects to ai.cloze.com) | ai.cloze.com; App Store v2026.5 (18 May 2026) |
| **Nat.app** | **Probably dormant**: site still sells a $370/yr plan; footer reads © 2022; no dated news found | nat.app, nat.app/pricing |
| **Queue Personal CRM** | Active (indie, solo developer) | App Store v2.4.2 (Oct 23) |
| **Hippo – Personal CRM** | Active (indie, tiny) | App Store v2.2.0 (~late Oct 2026) |

---

## 1. Monica (monicahq.com, open source)

**Status: transitional, and nearly unavailable to new users right now.**
- GitHub `monicahq/monica`: 25,560 stars, 795 open issues, not archived, last push 2026-10-28 (https://api.github.com/repos/monicahq/monica). Commits are sparse: there is a gap from 30 Aug 2025 to 24 Sep 2026. The Sep 2026 commits disable socialite signups and add "instance deletion notice on login page" (https://api.github.com/repos/monicahq/monica/commits).
- Releases: latest stable v4.1.2 (2024-05-04); latest beta v5.0.0-beta.5 (2025-04-21) (https://api.github.com/repos/monicahq/monica/releases). The "Chandler" rewrite shipped as the v5 beta line on `main`, which the README calls "our beta version" (https://github.com/monicahq/monica).
- **Chandler is effectively superseded.** On 30 Aug 2026 the founder announced Monica is being rebuilt *again* from scratch as "v3", because the current version is no longer "the personal CRM I would build today" (https://monicahq.com/en/blog/we-are-rebuilding-monica). The older 2022 post that introduced Chandler (https://monicahq.com/en/blog/a-new-version-is-coming/) now carries the banner "Monica v3 is coming before the end of 2026."
- Registration closed: "Registration is closed" post dated 26 Oct 2026 says v3 should open "within a few days" (https://monicahq.com/en/blog/registration-is-closed/).
- **Hosted v1 data deletion.** PR #7978 adds a login notice that "this instance and all its data will be deleted at the end of December 2026" (https://github.com/monicahq/monica/pull/7978). [VERIFIED-DOC, code]
- v3 page (https://monicahq.com/en/v3/): customizable record fields; people linked to pets, companies and homes; a journal "that connects naturally to people, dates, and reminders"; a full API; mobile-first web app, then native iOS/Android. Privacy: "Your data stays yours", no ads, no data sale, "No model trained on your contacts." No AI features are described. [MARKETING, not shipped]
- Design stance (30 Aug 2026 post): relationships should be their own domain; Monica "shouldn't decide how important someone is." This is close to Kinship's no-quantification rule.

Questions 1–11 (v1/v4 as shipped; from README and docs, not hands-on):
1. **Add people:** manual entry; vCard import (v1). No Gmail/LinkedIn/iMessage/WhatsApp import.
2. **Capture:** manual forms: notes, activities, "how you met", journal/diary, "how your day went", tasks, gifts, debts. No NL, voice or AI. README: "Monica does not have built-in AI with integrations like ChatGPT." [VERIFIED-DOC]
3. **Conversation understanding:** none.
4. **Visual:** list + contact page with sections; per-contact timeline; journal.
5. **Bring-back:** birthday reminders; user-set reminders; "stay in touch" frequency (v1).
6. **Actions:** gift ideas list, debts. No drafts or intros.
7. **After contact:** manual activity log.
8. **Privacy/control:** strongest in the category: self-hostable, OSS, export (contacts, relationships, notes, reminders, activities, custom fields), no ads (https://monicahq.com/en/pricing/). Hosted v1 users face forced deletion in Dec 2026.
9. **Maintenance:** very high; everything is manual.
10. **Pricing:** hosted $9/mo or $90/yr; self-host free (pricing page). Target: privacy-minded individuals; friends & family *and* business (repo description).
11. **Strengths:** trust, ownership, a rich "life" data model. **Weaknesses:** manual upkeep, slow cadence, repeated rewrites. A Go/React fork, "Bonds", appeared in Mar 2026 with its author saying Monica had "slowed down significantly" (https://www.hnshowcase.com/post/47286760/bonds-open-source-personal-relationship-manager-go-and-react). [3P]

**Challenge to Kinship:** (f) privacy/ownership and (g) a warm friends-and-family stance, but with no capture intelligence. The v3 journal-linked-to-people-and-reminders concept overlaps Kinship's memory model. Watch the v3 launch (expected Nov–Dec 2026).

---

## 2. Mesh (formerly Clay; me.sh)

**Status: active & GA.**
- **Rebrand:** "Clay is becoming Mesh", 26 Mar 2026 (https://me.sh/stories/mesh). Stated reasons: "namespaces get crowded" (Clay.com, an unrelated GTM enrichment company) and "a commitment to a much broader vision." The same team and app; clay.earth redirects.
- **Acquisition:** Automattic, "Automattic Welcomes Clay", 12 Jun 2025 (https://automattic.com/2025/06/12/automattic-welcomes-clay). The team joined the "Other Bets" division with Beeper and Gravatar; the plan is integration with the messaging ecosystem. Price undisclosed.
- **Android:** launched; TechCrunch 12 Aug 2026 (https://techcrunch.com/2026/08/12/mesh-automattics-crm-for-everyone-comes-to-android). Nexus AI in "early access"; a voice hands-free mode is "being tested"; Beeper interop lets you draft a message to someone in Beeper. TechCrunch: ~70% of customers use it for some business purpose; co-founder Achariam says "every feature that we think about has to apply to both" (consumer and business).
- **Claimed scale:** homepage counter "191,013,920 relationships managed" and "Over 100 million relationships" (me.sh, the vendor's own claim). The rebrand post says ">170 million". Dex's review quotes ">150 million". These count contact records, not users. No user count is published.
- **App Store** (https://apps.apple.com/us/app/mesh-contacts-crm/id1463073824): 4.4★, 765 ratings; v2026.7.3 (~30 Oct 2026); seller Clay Software, Inc., © 2026 Automattic. IAP: annual $119.99, monthly $19.99. Privacy label: contacts, emails/texts and search history are linked to you. Screenshot images: the store page served placeholders only. Product images are on me.sh: `https://me.sh/_next/static/media/hero.3a6f_vr-5nb_r.jpg`, `.../all.2ddeeucczc-hr.jpg`, `.../circles.36lccoe_28ewa.png`, `.../pulse.2cytm9s_f5q75.png`, `.../team.31wvpo9_eigu5.png`.

1. **Add people:** auto-builds contacts from email, calendar, address book, LinkedIn, X, Facebook, Instagram, WhatsApp and iMessage; business-card scan; CSV (Pro) (App Store description; pricing page). [VERIFIED-DOC store] It is "self-filling" and enriches profiles with photos, bios and work history from public and connected data.
2. **Capture:** typed notes on contacts. Nexus can "edit notes with AI" (testimonial). Voice mode is only in testing (TechCrunch). No documented NL extraction of facts from notes into structure. [MARKETING/early access]
3. **Conversation understanding:** it ingests email, calendar and message *metadata/history* to build interaction timelines. No documented extraction of promises or follow-ups from conversations. Nexus answers questions over notes and contact data. Evidence: vendor docs + TechCrunch; Nexus quality complaints in reviews.
4. **Visual:** Home *feed* of network updates (filters: Birthdays, Events, News, Social changes, Posts, Reconnect, Reminders, Sharing, Upcoming); contact pages with timeline; groups; NL search. "Relationship strength visualization" (me.sh/atlas). "Circles" and "pulse" views appear in product imagery.
5. **Bring-back:** reconnect cadences, "Reconnect" suggestions for people not contacted recently, birthdays, job/social changes, news. Nexus "quiet heads-up when a relationship that matters is going cold" (https://library.me.sh/best-personal-crm/, vendor). This is **frequency/recency-driven plus life-update feeds**, not event or promise-driven.
6. **Actions:** Nexus can draft reconnection emails, "gift recommendations", invitation lists, pre-call briefs and warm intros (YouTube channel description https://www.youtube.com/channel/UCEMTNASRTzmIMBouGN0YK4g; library.me.sh). Beeper message drafting. [MARKETING/early access]
7. **After contact:** email, calendar and messages are auto-logged to the timeline from connected sources; the reconnect timer presumably resets. No documented post-interaction follow-up prompt.
8. **Privacy:** "Nexus and Mesh do not use your data to train our models"; "AI features are entirely opt-in"; third-party AI partners are barred from training; deletion with 90-day backup retention; SOC 2 (https://library.me.sh/knowledge-base/security-and-privacy/). [VERIFIED-DOC policy] Export to CSV exists (KB article title). Enrichment from public profiles is core to the product, which raises consent questions about the *contacts themselves*; me.sh also hosts public SEO "profile" pages of named people (e.g. https://me.sh/profile/brian-clay).
9. **Maintenance:** low for data entry (auto-built), but users report duplicates and import failures.
10. **Pricing** (https://me.sh/pricing): Personal free, up to 1,000 contacts, **credit card required**; Pro $10/mo (-50% badge); Team $40/seat/mo; Enterprise by contact. 14-day Pro trial. Target: networkers and executives first; claims to design for consumers too.
11. **Complaints:** App Store 1★ "Not as good as you'd hope" (Jan 22): notes missing, Nexus did nothing on contact pages, archive-only, refund sought for the $120 plan. 1★ "Terrible" (23 Mar 2024): iMessage import failed and could not be retried, no dedupe (both on the listing above). The Dex review lists thin organization tools, mobile apps that feel cramped and LinkedIn import without filtering (https://getdex.com/blog/mesh-review/) [COMPETITOR-AUTHORED]. Walkthroughs: "Intro to Clay" https://www.youtube.com/watch?v=-44rM3-NCbE; "Clay Nexus demo with ChatGPT" https://www.youtube.com/watch?v=_GGZJnGl098; "Clay: Personal CRM Full Review" https://www.youtube.com/watch?v=n7KZA0DzARQ.

**Challenge to Kinship:** the strongest "zero data entry" and "life updates" product. Its backing (Automattic plus the Beeper messaging layer) could become a consumer messaging-native relationship assistant. It does **(d)** in part (drafts, gifts, intros in early access) and **(a)** for *structured* data, but not for *conversational memories*. It still quantifies relationships (strength, going-cold), which Kinship deliberately does not.

---

## 3. Dex (getdex.com)

**Status: active & GA. The fastest-moving incumbent on AI in 2026.**
- **App Store** (https://apps.apple.com/us/app/id1472132715): 4.4★, 266 ratings; v3.79.0 (~29 Oct 2026); seller Dana HQ, Inc. IAP: Premium $19.99/mo, $47.99/qtr, $143.99/yr; Professional $34.99–39.99/mo, $79.99/qtr, $239.99/yr. Notes: 3.75.0 (Oct 7) "Talk to Dex"; 3.61.0 (Jul 22) better voice-to-text dictation.
- **Claimed scale:** "30,000+" users, founded 2019 (https://getdex.com/llms-full.txt, vendor claim). YC company (https://www.ycombinator.com/companies/dex).
- **Changelog** (https://getdex.com/changelog) [VERIFIED-DOC]:
  - **Oct 2026, Conversation Memory:** "Every night, Dex reads the day's conversations and adds a short note (one to three sentences) to each contact's timeline". Covers WhatsApp, iMessage, LinkedIn and Instagram; skips trivial chats. "The notes it creates are regular notes, so you can edit, delete, or search them." **On by default**, with a morning email listing the added notes; turn off in Settings → Automation. Also "Important Title Changes" and "Keep-in-touch now resets when you email or message someone."
  - **Sep 2026:** Talk to Dex voice mode (ask, add people, add notes, set reminders by voice; "Dex answers out loud and makes the change for you"). Granola sync: meeting summaries become notes on each attendee and **count as interactions**; unknown attendees are auto-added. Copilot can edit and cancel reminders.
  - **Aug 2026:** Copilot and assistants create, reschedule and cancel calendar events; mark keep-in-touch done.
  - **Jun 2026:** Dex Shuffle (experimental) surfaces someone and "drafts a few short, editable messages. Nothing is ever sent automatically." Daily Digest rebuilt.
  - **May 2026:** MCP for Claude/ChatGPT; "Dex Skill" for meeting prep and follow-up suggestions. Real-time multilingual voice transcription.
  - **Apr 2026:** Dex in ChatGPT (log notes by text or voice, set follow-ups).
  - **Mar 2026:** iPhone Action Button quick notes with AI Cleanup.
  - **Feb 2026:** AI-personalized Mail Merge drafted from notes and history (review before send).
  - **Jan 2026:** add reminders and follow-ups while writing a note; AI Cleanup of dictation.

1. **Add people:** LinkedIn (sync up to 2,500 or 9,000 connections), Gmail, Google Calendar, Outlook, iMessage, WhatsApp 1:1, Facebook/Instagram (friends, birthdays, DMs), phone contacts (two-way), CSV, business-card scanner, Chrome extension (https://getdex.com/pricing; llms-full.txt). [VERIFIED-DOC]
2. **Capture:** typed notes, voice dictation with AI Cleanup, voice mode, SMS interface, ChatGPT/Claude via MCP, Granola notes. AI auto-classifies note type. Follow-ups can be attached while writing a note (Jan 2026). [VERIFIED-DOC]
3. **Conversation understanding:** **Yes, at summary level.** Conversation Memory writes nightly 1–3 sentence summaries from real message threads, and Granola imports meeting summaries. Neither is documented as extracting *structured facts or promises* into reminders automatically. Follow-up suggestions come via the MCP "Dex Skill". Evidence: changelog [VERIFIED-DOC]; no independent quality reports yet (shipped Oct 2026).
4. **Visual:** contacts table, groups and tags, kanban by keep-in-touch frequency (3P mention), map view, per-contact unified timeline.
5. **Bring-back:** **per-contact cadence** (weekly, monthly, quarterly); birthdays; LinkedIn job and title changes; pre-meeting brief emails; Daily Digest; Shuffle (random resurfacing). Cadence-driven at core.
6. **Actions:** AI Assist message drafts, Shuffle drafts, mail merge, calendar event creation, research credits (enrichment). No gifts or intros documented.
7. **After contact:** **auto-logged** from email, calendar and messages; **keep-in-touch timer resets automatically** (Oct 2026); Granola meetings count as interactions; Conversation Memory writes the note. This is the closest any incumbent comes to **(e) closing the loop**, though it is not a "what did you promise?" prompt.
8. **Privacy/consent** (privacy policy updated 23 Sep 2026, https://getdex.com/privacypolicy/): notes and messages are sent to "third-party model providers" (OpenRouter, OpenAI, Groq, Deepgram). It explicitly bars using **Google** data to train models, but is silent on training with other data. It "may fetch publicly available … information from the public web" for enrichment. Export is three CSVs (contacts, timeline, network updates) (https://getdex.com/docs/workflows/export). Claims SOC 2 Type II and ISO 27001 (llms-full.txt); Mesh disputes the SOC 2 claim [COMPETITOR-AUTHORED]. **Conversation Memory is opt-out, not opt-in**: no per-note approval before AI-written notes land on the timeline.
9. **Maintenance:** medium. Auto-sync reduces entry, but cadences, groups and tags are user-managed; reviewers cite sync and dupes.
10. **Pricing:** Premium $12/mo annual ($20 monthly); Professional $20/mo annual ($34 monthly); Team $40/user/mo; 6-day trial, card required; no free tier (https://getdex.com/pricing). Target: professionals, networkers, founders, real-estate (YouTube "Using Dex for Real Estate"). Tagline "built for people, not sales pipelines."
11. **Complaints** (App Store listing): slow load and multi-minute sync, a deleted group reappearing (2023); LinkedIn sync failures and an incomplete map (2024); **VoiceOver inaccessible** (2025). Walkthroughs: https://www.youtube.com/watch?v=77u49y_gcjY (2021 getting started), https://www.youtube.com/watch?v=kZhtb0mChxo (iMessage sync), https://www.youtube.com/watch?v=AjKAm5J62KM (WhatsApp sync). Independent-ish ranking: Happenstance (Aug 2026) names Dex "for most people" (https://happenstance.ai/guides/best-personal-crm; Happenstance is itself a network-search vendor).

**Challenge to Kinship: the biggest direct threat.** In 2026 Dex shipped (a) voice and NL capture, a passive form of (b) (notes derived from real conversations), (d) drafts, and part of (e) (auto interaction logging, timer reset, Granola notes). Its gaps are where Kinship can differ: consent before AI notes land (on-by-default); cadence-based prompting rather than promise/event-based; a professional, power-user UI; and no consumer warmth.

---

## 4. Covve: Personal CRM

**Status: active & GA.** The company's front door, though, is now B2B lead capture (https://covve.com/: scan cards and badges, "AI qualifies leads", "Trusted by over 2 million professionals", "4.8 with over 33,000 reviews", all vendor claims).
- **App Store** (https://apps.apple.com/us/app/id958935377): "Covve: Personal CRM & Contacts", 4.5★, 626 ratings; v29.8 (~31 Oct 2026); seller Covve Visual Network Ltd. IAP: $4.99/$12.99 monthly; $49.99/$79.99/$119.99 annual.
1. **Add:** phone address book sync (Google, iCloud, Outlook/O365); card scanner. No LinkedIn import [3P Dex review https://getdex.com/blog/covve-review.md, COMPETITOR-AUTHORED].
2. **Capture:** typed notes; an **email-based AI assistant** for data entry ("available 24/7 via email"); voice input mentioned for the lead-capture product. [VERIFIED-DOC store]
3. **Conversation understanding:** none documented beyond the email assistant parsing what you send it.
4. **Visual:** list; weekly "keep in touch" short list; **streaks and interaction stats** (v28 weekly/monthly views).
5. **Bring-back:** per-person reminder rhythm; news about contacts (3P).
6. **Actions:** "draft catch-up emails"; digital business cards.
7. **After contact:** manual interaction logging.
8. **Privacy:** **end-to-end encryption** of notes, interactions, reminders and family info since v29; Covve cannot recover the key (help center, updated 30 Oct 2025, https://help.covve.com/doc/introducing-end-to-end-encryption-kb). A 2020 data breach is noted in App Store reviews and by Mesh (23M emails, per Mesh's page citing Bitdefender) [COMPETITOR-AUTHORED].
9. **Maintenance:** high (manual logging).
10. **Pricing:** Free (20 contacts); Pro ~$9.99–12.99/mo (Dex review). Target: professionals and networkers.
11. **Complaints:** sync created duplicates and erased nicknames (2023); breach trust (2020) (App Store). Mobile-only; email-only AI [3P].
**Challenge:** E2E encryption is a credible "(f) control" story. It also gamifies and quantifies (streaks, stats), which Kinship avoids.

## 5. UpHabit

**Status: appears discontinued.** Both US App Store listings, https://apps.apple.com/us/app/id1335632832 and https://apps.apple.com/app/id1495261277, return **404** today. The developer page https://apps.apple.com/au/developer/uphabit/id1335632831 lists no apps. uphabit.com returns HTTP 503. Dex states "UpHabit: shut down … personal CRM apps … April 2026", after a 2022 shift to "Relationship Selling" and "Salesforce Hygiene" (https://getdex.com/blog/personal-crm-list/, Aug 2026, COMPETITOR-AUTHORED). **No primary shutdown announcement was found.** Earlier positioning: a mobile personal CRM with intros feature, ads-free, later "Personal CRM for Business."

## 6. Garden: Stay in Touch

**Status: dormant (abandoned but still listed).** https://apps.apple.com/us/app/id1230466454: Meaning Labs, Inc.; 3.9★, 50 ratings; last version 1.1.8 on **06/04/2020**. Free. Model: per-contact reminder frequency, last-contact date, a short note; a "Reminder Auto-Pilot" (2019). Review complaint: "no email app integration." Dex lists it as dormant. **No challenge** beyond showing the consumer "stay in touch" niche has been tried with a light touch and abandoned.

## 7. folk (folk.app)

**Status: active & GA, but a team/sales CRM, not personal use.** Pricing (https://folk.app/pricing): Standard $24/member/mo annual ($30 monthly); Premium $48 ($60); Enterprise from $80. 2-week trial, no card. Features: pipelines, enrichment, LinkedIn extension, email/calendar/**WhatsApp sync**, "AI Assistants". The **Follow-up Assistant** reviews email and WhatsApp conversations, flags moments to reconnect and drafts a message in your tone. The **Recap Assistant** produces an overview, key points and "upcoming actions" from emails, notes and interactions (https://folk.app; https://www.producthunt.com/p/folk-2/folk-assistants) [MARKETING]. Business-card scanning and voice notes are listed on all tiers. Target: sales teams, agencies, startups.
**Challenge:** it is the clearest example of **conversation-driven follow-up detection** (closer to (c) and (e) than cadence), but framed for deals and pipelines in a B2B UI. It is not a consumer competitor.

## 8. Cloze

**Status: active & GA, now positioned for real-estate brokerages** (cloze.com 301 → https://ai.cloze.com/; customers named include Windermere, Compass and Coldwell Banker; "boosts sales by 36%" is the vendor's claim).
- **App Store** (https://apps.apple.com/us/app/id596927802): 4.7★, 2.8K ratings; v2026.5 (18 May 2026). IAP: Pro $19.99/$199.99; Business Silver $24.99/mo or $249.99/yr; Gold $34.99/mo or $349.99/yr; Platinum $49.99/mo or $499.99/yr; 14-day trial.
- Model: **auto-captures email, calls, texts, meetings and files** into a profile per person; reconnect reminders; daily agenda suggesting follow-ups. **Maia** "virtual AI assistant" (v2025.9): real-time transcription of in-person meetings with **minutes and action items**, plus meeting booking. Built-in ChatGPT drafting (2023.4); AI timeline summaries (2024.6). [VERIFIED-DOC store notes]
**Challenge:** shows that "transcribe a conversation → action items → follow-up" is a mature business pattern. Its audience is professional and its UI dense.

## 9. Nat.app

**Status: probably dormant.** https://www.nat.app/ and https://www.nat.app/pricing are live: "Magic" $370/yr, student $97/yr, 10-day trial. Footer © 2022; no dated updates found. Model: Gmail + Google Calendar ingest; scans the inbox for conversations needing follow-up; one-click template follow-ups; meeting notes inside Gmail; pre-meeting emails; auto-categorizes contacts to flag "relationships that need attention." Target: consultants, founders, freelancers. G2: 1 review (https://g2.com/products/nat-app-personal-crm/reviews).
**Challenge:** an early version of inbox-detected follow-ups (e); email-only and professional.

## 10. Queue Personal CRM (indie)

**Status: active.** https://apps.apple.com/us/app/id1451429218: Jeremy Lubin; 4.4★, 42 ratings; v2.4.2 (Oct 23): WhatsApp sync via the Mac app. v2.4.0 (Sep 30): "Siri AI support (beta)", semantic search, **"snooze-until-reply"**, pacing controls. v2.3.0 (Aug 27): Apple Mail and Calendar sync with email and text **summaries**. Imports from iPhone, Google, calendar and LinkedIn; calendar meetings auto-count as catch-ups; reminders for intervals, birthdays, anniversaries, job changes and **post-catch-up notes**. With the Mac companion it auto-logs email, texts, calls and FaceTime, **analyzes on-device**, and stores summaries in the user's iCloud. IAP $4.99 and $49.99. 9to5Mac spotlight 14 Jun 2025 (https://9to5mac.com/2025/06/14/indie-app-spotlight-queue-personal-crm/).
**Challenge:** a privacy-respecting (on-device, iCloud) auto-logging and summarizing design with a post-catch-up note prompt: a small but real analogue of (e) + (f). It remains cadence-based.

## 11. Hippo – Personal CRM (indie)

**Status: active, tiny.** https://apps.apple.com/us/app/id1458330948: Roel van der Kraan / Studio Skipper; 3.0★, 8 ratings; v2.2.0 (~late Oct 2026; Siri with Apple Intelligence on iOS 27, Shortcuts). Notes, events, reminders and relationships per contact; **no servers**, data on device + iCloud; free to 25 contacts; $1.99/mo, $13.99–14.99/yr, $29.99 lifetime. Consumer-friendly, manual. Low threat.

---

## Other personal CRMs active 2025–2026 (independent discovery)

These are mostly very small, with 1–5 App Store ratings each. Together they show that **AI voice/NL capture with fact extraction is becoming commodity in the long tail.**
- **Eidra** (https://apps.apple.com/us/app/id6763976011): voice or typed note → "AI extracts names, places, interests, and follow-ups"; ask questions later; pre-meeting briefings; Face ID-locked contacts; audio deleted after transcription; no training on user data. $2.99–4.99/mo. 1 rating. Released May (year not shown; © 2026).
- **Keep AI – Personal CRM** (https://apps.apple.com/app/id6751458016): v1.0 27 Sep 2025; speak or type after a meeting; AI pulls people, dates, follow-ups, preferences and family details into a timeline per relationship; suggests next actions; "All data lives on your iPhone." $7.99/mo, $49.99/yr. 5 ratings.
- **Ember** (keepember.com; https://www.producthunt.com/p/ember-relationship-keeper/ember-0897a07b-139c-478a-baf7-ed63c2fc7139): "AI Keeper"; one sentence saves a note or sets a reminder; local DB; for family, friends, clients and mentors; free.
- **Orvo** (Dex comparison https://getdex.com/blog/dex-vs-orvo/; PH https://www.producthunt.com/p/orvo/orvo-2): AI voice notes + transcription, extracts contact details, icebreakers, email drafts; ~$15–19/mo Pro. Professional/networking.
- **Tilly** (https://www.tilly.social/en): open source; client-side encryption; AI Plus tier ($6/mo) organizes notes and suggests actions; nudges to "follow up on meaningful conversations." 3P description only.
- **Poppy: Connection Keeper** (https://apps.apple.com/app/id6759696906): v1.5.0 Aug 21; "living garden view" that blooms as you check in; local-first; export; free; Show HN Mar 2026 (https://hn.nuxt.dev/item/47257352). Consumer-warm but **cadence-and-check-in gamified**: it is the closest *visual* analogue to Kinship's garden/sprig metaphor.
- **Bonds** (Go/React Monica-like, HN Mar 2026), **Vellaci**, **Recall People**, **MemoCue**, **Contacts Magic**, **Reach**, **inTouch**, **Kontaktr**, **Contact Journal**: long tail, not assessed in depth.

## Pivots and shutdowns (with links)

| Product | Event | Date | Link (primary where available) |
|---|---|---|---|
| Clay → **Mesh** | Acquired by Automattic | 12 Jun 2025 | https://automattic.com/2025/06/12/automattic-welcomes-clay |
| Clay → **Mesh** | Renamed | 26 Mar 2026 | https://me.sh/stories/mesh |
| **Monica** v1 hosted | Registration closed; hosted data to be deleted end Dec 2026; v3 rebuild | 30 Aug, 24 Sep, 26 Oct 2026 | https://monicahq.com/en/blog/we-are-rebuilding-monica ; https://github.com/monicahq/monica/pull/7978 ; https://monicahq.com/en/blog/registration-is-closed/ |
| **UpHabit** | Personal CRM apps shut down (pivot to "Relationship Selling" in 2022) | Apr 2026 (per Dex) | https://getdex.com/blog/personal-crm-list/ (competitor-authored); App Store 404s confirm removal |
| **Cloze** | Repositioned to real-estate brokerages (domain → ai.cloze.com) | by 2026 | https://ai.cloze.com/ |
| **Covve** | Company front door now B2B lead capture; personal app continues | by 2026 | https://covve.com/ |
| **Garden** | Abandoned (last update 4 Jun 2020) | — | https://apps.apple.com/us/app/id1230466454 |
| **Nat.app** | Likely dormant (© 2022, no dated updates) | — | https://www.nat.app/ |
| **FollowUp.cc** | Pivoted to an inbox reminder tool after its 2018 acquisition | 2018 | https://followup.cc/ (via Dex) |
| **Nouri** | Pivoted to event ticketing and networking | undated | https://app.nouri.ai/ (via Dex) |
| **KinKeeper** (Kith + Kin, family-care/health wallet, adjacent) | Discontinued; data purged | 1 May 2026 | https://intercom.help/kithandkin/en/articles/13624059-kinkeeper-being-discontinued-effective-may-1-2026 (article returned 404 on fetch today; content from search snippet) |
| Contactually (Compass) | Shut down | 2022 (per a 3P graveyard) | https://findbestcrm.pages.dev/fr/graveyard/ |

---

## Differentiator check (honest)

| Candidate | Who already does it well | Verdict |
|---|---|---|
| **(a) Conversational capture, minimal input** | **Dex** (voice mode, dictation + AI Cleanup, Conversation Memory, Granola), **Cloze Maia** (meeting transcription → minutes/actions), **Mesh** (zero-entry auto-build; voice in testing); long-tail Eidra, Keep AI, Orvo, Ember | **Common now.** Not a differentiator on its own. The difference must come from the *quality and trust* of what is extracted. |
| **(b) Source-grounded memory** | Dex Conversation Memory notes sit on the timeline of the conversation date and are editable; Granola notes link to meetings. **No one documents "this memory came from this sentence" provenance** or shows the source next to the fact. | **Partially open.** Kinship can lead with explicit per-memory provenance. |
| **(c) Prompts from real events and promises, not cadence** | Incumbents are **cadence/recency-first** (Dex, Mesh, Covve, Queue, Garden, Monica). folk's Follow-up Assistant and Nat (inbox needs-reply) are conversation-triggered; Mesh and Dex add job changes, birthdays and news. Eidra and Keep AI claim "follow-ups" extracted from notes. | **Mostly open in the consumer space.** Promise-derived prompts exist only in B2B (folk, Cloze action items) and in tiny indies. |
| **(d) Helping take real-world action** | Dex (AI drafts, Shuffle, mail merge, calendar events), Mesh Nexus (reconnect drafts, gift ideas, intros, invite lists, early access; Beeper drafting), Cloze/folk drafts | **Common for drafts**; gifts and intros are only claimed by Mesh, still early access. |
| **(e) Closing the loop after an interaction** | Dex: auto-logs, resets keep-in-touch on message (Oct 2026), Granola meetings count as interactions. Queue: post-catch-up note reminders, "snooze-until-reply". Cloze: action items from meetings. | **Partly covered** (logging and timer reset). Nobody does "what happened / what did you promise → next step" in a consumer frame. |
| **(f) Trustworthy correction, consent, control** | Monica (OSS, self-host, "no model trained on your contacts"); Covve (E2E encryption); Queue, Hippo, Keep AI, Ember (on-device/iCloud); Mesh (AI opt-in, no training). **Counter-examples:** Dex Conversation Memory is **on by default, without per-note review**; Mesh and Dex enrich from the public web. | **Privacy claims are common; consent *per AI-derived memory* is not.** Kinship's "user says yes to sensitive/ambiguous readings" is genuinely uncommon. |
| **(g) Welcoming consumer (not business) experience** | Monica (friends & family, playful v3), Poppy, Garden (dead), Hippo, Ember. Mesh claims "both" but ~70% business use (TechCrunch). Dex, folk, Cloze, Nat, Covve are professional. | **Under-served among serious products.** The consumer-warm apps are manual, tiny or dormant. |

**Bottom line:** Dex in 2026 is the most direct challenge on (a), (d) and (e). Mesh/Automattic is the strategic wildcard: messaging-native via Beeper, with consumer intent. Kinship's defensible ground is the *combination* of four things: consent-first extraction with provenance (b, f); promise- and event-based prompts instead of cadence and "going cold" scores (c); a non-quantified consumer tone (g); and a closed loop framed as care rather than CRM hygiene (e).
