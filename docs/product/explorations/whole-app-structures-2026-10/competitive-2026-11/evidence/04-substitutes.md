# 04 — Substitutes: tools people already use to remember the people in their lives

Research date: **1 Nov 2026**. All URLs accessed 1 Nov 2026 unless noted. No accounts created, nothing entered into any product.

**Source-quality labels** used below:
- **[P]** primary (vendor newsroom, support/help page, official pricing page, official plugin directory)
- **[R]** credible secondary (established tech press: MacRumors, 9to5Google, Engadget, PCWorld, The Register, Tom's Guide, Pew)
- **[W]** weak secondary (aggregators, SEO blogs, competitor blogs, search-snippet-only). Treat as unconfirmed.

Several OpenAI pages (help.openai.com release notes, Memory FAQ, openai.com/index posts) returned HTTP 403 to the fetcher. ChatGPT claims therefore rest on [R]/[W] coverage of those posts and are flagged.

Kinship's capability lens, used throughout:
(a) natural-language capture with minimal manual input · (b) source-grounded memory · (c) event/promise-based prompts rather than frequency reminders · (d) help taking real-world action · (e) closing the loop after an interaction · (f) correction/consent/control · (g) welcoming consumer feel.

---

## 0. Bottom line

1. **No general tool models "a person" as a first-class object with dated, sourced memories.** Contacts has a free-text Notes field. AI assistants store memory as account-level facts or profile summaries. Journals store entries. An OpenAI community post (26 Sep 2026) describes this gap from the user side: each mention of a person is stored as an isolated fragment, with no linking, chronology or alias handling. [W, user forum] https://community.openai.com/t/people-relationships-memory-with-person-centered-temporal-context/1401089
2. **The free iPhone stack is the most serious default substitute.** Contacts birthdays and anniversaries, Calendar Birthdays, Reminders "When Messaging", Messages Send Later, and the new iOS 27 Call Context birthday/anniversary prompts are all free and preinstalled. Siri AI personal context began a beta rollout on 14 Sep 2026. It is the first time Apple's assistant can search a user's messages, mail, notes and photos.
3. **Assistant memory is now a commodity, and proactivity is moving to user-scheduled tasks.** ChatGPT (Dreaming V3, Jun 2026), Claude (memory free since Mar 2026), Gemini (Personal Intelligence since Jan 2026) and Copilot (Oct 2025) all remember things you tell them and let you view and edit that memory. Proactivity has not stuck as a feed:
   - OpenAI **retired ChatGPT Pulse** in Jun 2026 and moved proactive updates into user-defined scheduled tasks.
   - Google's **Daily Brief** (free in the US since Sep 2026) is task- and deadline-oriented, not people-oriented.
4. **The single feature closest to Kinship's thesis is Gemini + Google Contacts (Jun 2026).** It can remind about saved dates such as birthdays and suggest people to reach out to. It is still rolling out, was first seen on AI Ultra, and "suggest people to reach out to" is a frequency-style nudge, not an event-grounded one.
5. **Nothing found closes the loop after an interaction** (e.g. "you promised to send X; did you?"). The nearest thing is Apple Watch **Siri Recap**, which writes ambient conversation summaries. It is **announced, not shipped** (beta "later this year"), needs Watch Series 12 or Ultra 4, does not attribute speech to people, and does not create reminders.

---

## 1. Apple

### 1.1 Apple Intelligence / Siri personal context: shipped vs announced (verified)

| Item | Status as of 1 Nov 2026 | Evidence |
|---|---|---|
| Personal-context Siri first promised (WWDC 2024) | Announced Jun 2024; then delayed | [P] https://www.apple.com/newsroom/2024/06/introducing-apple-intelligence-for-iphone-ipad-and-mac/ |
| iOS 26.4 (spring 2026) | **Did not ship** personal Siri. Bloomberg/Gurman (Feb 2026) reported it slipped past 26.4. Apple said it was "still on track" for 2026 | [R] https://www.mactech.com/2026/02/11/the-more-personalized-version-of-apples-siri-is-delayed-yet-again ; [R] https://www.t3.com/tech/ai/gemini-powered-siri-still-on-track-for-2026-release-apple-tells-major-outlet |
| Google Gemini as the base for Apple's next foundation models | Multi-year deal confirmed Jan 2026 (per reporting) | [R] MacTech, same Feb 2026 coverage. Apple's own Jun 2026 release does not mention Gemini or Google: https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/ |
| "Siri AI" announced (WWDC, 8 Jun 2026) | Announced. Personal context across messages, email and photos (e.g. "a restaurant tip a friend sent"). Writing in Mail/Messages adapts tone per recipient. No memory, birthday or relationship features described | [P] https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/ |
| **Siri AI shipped** | **Shipped as a beta on 14 Sep 2026** with iOS 27:<br>• English only; French, Japanese, Korean, Portuguese and Spanish said to follow "next month"<br>• **Waitlist**<br>• Not in the EU on iOS, iPadOS or watchOS; not in mainland China<br>• iPhone 15 Pro or later<br>• Paid tier for server features signalled "in the future" | [P] https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/ ; [P] https://support.apple.com/en-us/127893 (published 22 Oct 2026) |
| Personal context scope | Shipped (beta). Messages, Mail, Calendar, Notes, Reminders "and more", including photos. Third-party apps only via Spotlight integration | [P] https://support.apple.com/en-us/127893 |
| Memory across conversations | **Not a feature.** The Siri app syncs conversation *history* via iCloud. A hands-on reviewer reports Siri AI "won't remember previous conversations" | [P] Apple support 127893 ; [R] https://www.idropnews.com/feature/siri-ai-ios-27-hands-on/265115/ (12 Jun 2026, beta 1) |
| Real-world quality (beta) | "Practical but plain." Personal context works best inside Apple's own apps. Mail search worked only in Apple Mail, not Gmail. Indexing takes days. In one test Siri guessed a date from Messages "off by a few years" | [R] https://www.engadget.com/2215572/apple-ios-27-preview/ (15 Jul 2026) ; [R] iDrop News above ; [R] https://www.macrumors.com/2026/06/10/ios-27-siri-ai-hands-on/ |
| **Siri Recap / Live Rewind** (Apple Watch ambient conversation summaries) | **Announced, not shipped.** Beta "later this year", English first. Needs Watch Series 12 or Ultra 4 plus iPhone 16 or later with Siri AI.<br>• Summaries do not attribute speech to people<br>• Auto-delete after 7 days unless saved<br>• Opt-in<br>• Apple warns outputs may be inaccurate | [P] https://support.apple.com/148354 (30 Sep 2026) ; [P] Apple Sep 2026 newsroom above |
| Call Context: birthday prompt when calling a contact | Shipped in iOS 27 (birthdays). **Anniversaries added in iOS 27.2.** MacRumors (17 Sep) describes 27.2 in beta; the page's later headlines (26 Oct 2026) report 27.2 released. Requires the date to be saved in Contacts. With Apple Intelligence, you can ask Siri to add the anniversary | [R] https://www.macrumors.com/2026/09/17/ios-27-2-could-save-your-relationship/ |

**Takeaway for Kinship:** Apple's personal context is **retrieval over the user's own data, on request**. It is not a curated per-person memory, and it does not proactively surface relationship moments beyond birthday and anniversary prompts at call time. Coverage is also limited: beta, waitlist, English only, no EU on iPhone.

### 1.2 Contacts
- **Notes field:** free text per contact. It exists and is used. In iOS 26 users complained about low-contrast Notes text; a forum thread says iOS 26.1 fixed it. [W, Apple Community] https://discussions-cn-prz.apple.com/en/thread/256136706?page=4
- **Folk practice:** r/LifeProTips commenters store kids' and partners' names and birthdays in contact notes. One parent puts the child's name in the contact *name* field because notes aren't visible at the moment of texting. [W, search snippets of Reddit threads] https://redlib.hackliberty.org/r/LifeProTips/comments/1qqra7j/lpt_keeping_track_of_peoples_interests_to ; https://axebps-redlib.hf.space/r/LifeProTips/comments/1j9zs8s/lpt_for_young_parents_meeting_their_kids_friends
- **Contact Posters** (since iOS 17): identity and visual only. In iOS 26 they still appear in few places. [R] https://tidbits.com/2025/11/17/how-to-set-contact-avatars-and-posters-on-the-iphone/
- **iOS 27/27.2:** birthday and anniversary Call Context (§1.1). Pre-launch leaks said Visual Intelligence would scan business cards into Contacts; not confirmed as shipped. [R] https://www.macrumors.com/2026/04/17/four-new-ios-27-features-leaked/
- **Covers:** (c) birthdays and anniversaries only, and only if typed in; (f) full user control; (g) familiar. **Does not:** (a) capture anything from natural language (except asking Siri to add a date), (b) keep sources or dates on notes, (d) suggest an action, (e) close any loop. **Cost:** free.

### 1.3 Calendar birthdays
The Birthdays calendar is auto-populated from Contacts birthdays, with alerts configurable for the day itself, 1 day, 2 days or 1 week before. [P, Mac help] https://help.apple.com/calendar/mac/10.11/en.lproj/icl1036.html ; [W] https://www.guidingtech.com/add-and-see-birthdays-on-iphone-calendar/
- Covers (c) for birthdays only, with zero ongoing effort once the dates are entered. Nothing else.

### 1.4 Reminders
- **"When Messaging" a person:** a reminder fires the next time you chat with a chosen contact in Messages. One contact per reminder; iMessage users only. [P] https://support.apple.com/en-ie/102484 ; [W] https://www.idownloadblog.com/2020/11/05/remind-when-messaging-tutorial/
  - This is the closest native analogue to a person-anchored promise ("tell Sam about the job"). It is manual and has no memory context.
- **Apple Intelligence suggested reminders (iOS 26):** share text from any app to Reminders and get suggested to-dos. Apple warns to check the outputs for accuracy. [P] https://support.apple.com/124025
- **Siri Suggestions in Reminders:** to-dos found in Mail and Messages. [R] https://www.macrumors.com/guide/ios-26-notes-app-reminders-app/
- **Covers:** (a) partially (NL dates, share-to-suggest), (c) promise-like to-dos, (f) yes. **Does not:** tie a to-do to a person's memory, or explain *why* it matters.

### 1.5 Messages
- **Send Later** (iOS 18+): schedule iMessages up to about 14 days ahead; iMessage only. [W/R guides] https://9to5mac.com/schedule-messages-send-later-ios-18/ ; https://www.asurion.com/connect/tech-tips/schedule-text-iphone/
- **Siri AI writing** matches each recipient's usual tone (iOS 27). [P] Apple Sep 2026 newsroom.
- Covers (d) action, i.e. sending. It does nothing for remembering.

### 1.6 Journal
- iOS/iPadOS/macOS 26: Journal on Mac and iPad, **multiple journals**, State of Mind logging. [R] https://www.macrumors.com/2025/06/09/journal-app-finally-coming-to-mac-and-ipad/ ; [R] https://9to5mac.com/2026/01/05/ipados-26-adds-new-journal-app-and-ive-been-using-it-almost-every-day/
- **Journaling Suggestions and people:** the "Discoverable by Others" setting lets the iPhone count how many *contacts* are nearby, to prioritise suggestions involving time with others. It **does not store which contacts were nearby** and does not name them. [R] https://9to5mac.com/2024/03/25/apple-journal-discoverable-by-others-setting/ ; [P] https://apple.com/legal/privacy/data/en/journaling-suggestions
- **No person tagging or person-centric recall found.** Covers (g) and private reflection. Does not cover (b) per person, (c) or (e).

### 1.7 Photos
- **People & Pets:** name recognised faces; reduce how often a person appears in Memories. [P] https://support.apple.com/en-us/HT207103
- **Apple Intelligence memory movies from a text description.** [P] https://support.apple.com/guide/mac-help/mchl35c53342
- Siri AI can find "photos with friends and family from a trip". [P] Jun 2026 newsroom.
- Covers identity and emotional recall (g). It does not prompt you to act for someone.

---

## 2. Google

### 2.1 Gemini Personal Intelligence (connected-app personal context)
- **Launched 14 Jan 2026** as a US beta for AI Pro and Ultra, personal accounts only.
  - Connects Gmail, Calendar, Drive, Photos, YouTube and Search history.
  - **Off by default**; users choose which apps to connect.
  - Gemini says it will "reference or explain the information it used", which is partial source-grounding.
  - Users can correct it, regenerate without personalisation, or use temporary chats.
  - 9to5Google notes it struggles with timing and nuance, "particularly regarding relationship changes, like divorces".
  - Google says it avoids proactive assumptions on sensitive data such as health.
  - [R] https://9to5google.com/2026/01/14/gemini-personal-intelligence/
- **Expansion:** US free users (Mar 2026), then global expansion announced 15 Apr 2026, excluding the EEA, Switzerland and the UK. [W/R] https://dataconomy.com/2026/04/15/google-expands-personal-intelligence-globally-to-all-gemini-languages/ ; https://www.androidauthority.com/gemini-personal-intelligence-expansion-3657523/
- **Memory of past chats ("Personal context"):** since Aug 2025, on by default; Temporary Chats are excluded. [R] https://9to5google.com/2025/08/13/gemini-personal-context/

### 2.2 Gemini + Google Contacts (closest feature to Kinship found)
- **Reported 5 Jun 2026.** Gemini can:
  - add, edit and delete contacts
  - **send reminders about saved dates such as birthdays**
  - suggest information to save to a contact
  - **suggest people to reach out to, or mark as VIPs**
  - Accessed via Personal Intelligence > Connected Apps; still rolling out; first seen on one AI Ultra account with "Gemini Spark".
  - No mention of notes on contacts.
  - [R] https://9to5google.com/2026/06/05/gemini-google-contacts/
- A secondary report says the integration was US-only. [W] https://www.newsbytesapp.com/news/science/googles-gemini-adds-google-contacts-inside-personal-intelligence-chats/tldr

### 2.3 Daily Brief (proactive)
- Announced at I/O (May 2026). **Free for US personal accounts since early Sep 2026.**
  - A morning summary with "Top of mind", "FYI" and "Looking ahead" sections, drawn from Gmail, Calendar, connected apps and past Gemini chats.
  - Sends a morning notification.
  - **No mention of birthdays, people or contacts.**
  - [R] https://9to5google.com/2026/09/08/gemini-daily-brief-free/
- **Scheduled actions** (2025): user-defined recurring prompts; paid tiers; cap of 10 active. [W] https://www.digit.in/how-to/apps/how-to-schedule-tasks-on-google-gemini.html ; https://www.neowin.net/amp/google-gemini-challenges-chatgpt-with-new-scheduled-actions-feature/

### 2.4 Google Photos
- Face groups with names and relationship labels. Ask Photos onboarding may ask you to identify people. Labels are private per account. A person can be hidden or blocked from Memories. [P] https://support.google.com/photos/answer/15318661 ; [P] https://support.google.com/photos/answer/6128838

---

## 3. General AI assistants with memory

### 3.1 ChatGPT (OpenAI)
- **Memory "Dreaming V3" (rolled out from 4 Jun 2026; Plus and Pro in the US first, Free and Go "over the coming weeks"):**
  - Memory curates itself in the background from chat history.
  - Adds a **summary page of what ChatGPT remembers, which the user can edit**.
  - Time-aware rewriting (e.g. "going to Singapore in July" becomes "went … July 2026").
  - [R] https://www.pcworld.com/article/3158111/chatgpt-new-dreaming-feature-makes-it-way-better-at-remembering-you.html (5 Jun 2026) ; [W] https://letsdatascience.com/news/openai-upgrades-chatgpt-memory-architecture-for-fresher-pers-b26b51d5 ; primary post (403 to fetcher): https://openai.com/index/chatgpt-memory-dreaming/
  - Secondary sources also describe settings for **which topics ChatGPT should raise and when**, plus per-item dismiss/delete. [W] https://www.digitalapplied.com/blog/chatgpt-memory-dreaming-v3-openai-2026-guide
- **Memory sources (May 2026):** a Sources icon under a response shows which saved memories, past chats or custom instructions shaped it. This is partial source-grounding at the response level. [W, a third-party summary of OpenAI release notes; the release-notes page itself returned 403. The weakest source in this section.]
- **Projects:** project-only memory option (Aug 2026 per secondary). [W] search summary of https://help.openai.com/en/articles/6825453-chatgpt-release-notes (403 to fetcher)
- **Proactivity:**
  - **Pulse** launched Sep 2025 for Pro only. It was **sunset on 17 Jun 2026**, with Pro access for 14 more days.
  - It was replaced by a **Scheduled hub** (Go, Plus, Pro, Business, Enterprise). Tasks can run at a set time or time window, can monitor the web or connected apps, and can be paused, edited or deleted.
  - [R] https://www.engadget.com/2196844/chatgpt-now-has-a-hub-for-scheduled-tasks/ ; [W] https://www.lilachbullock.com/chatgpt-pulse/
- **People-specific gap:** the user proposal for a "People & Relationships" memory layer (§0.1) lists fragmenting, staleness and nickname confusion as current failures. [W] community.openai.com link above.
- **Covers:**
  - (a) best-in-class NL capture
  - (b) partial: memory exists and response-level sources exist, but there is no per-person record with origin quotes
  - (c) only if the user sets up a scheduled task
  - (d) good drafting help
  - (f) view, edit and opt-out
  - (g) general-purpose chat, not relationship-shaped
- **Does not:** keep person objects, ground each memory in its source, detect promises and turn them into dated prompts by default, or close the loop. **Cost:** Free tier; Plus and Pro paid (prices not re-verified here).

### 3.2 Claude (Anthropic)
- **Memory (Help Center, current):**
  - On by default for Free, Pro, Max and Ultra.
  - Stores "individual topics".
  - **Settings > Your Claude > Manage: read, edit and delete each topic.** Users can also tell Claude in chat to remember or forget.
  - Incognito chats; per-chat memory off.
  - **Project-scoped memory**, with an option to cut a project off from account memory.
  - Searching past chats is a paid feature.
  - No proactive surfacing documented.
  - [P] https://support.claude.com/en/articles/11817273-using-claude-s-chat-search-and-memory-to-build-on-previous-context
- **Memory free since 2 Mar 2026, plus an import tool** for memories from ChatGPT and Gemini. [R] https://macrumors.com/2026/03/02/anthropic-memory-import-tool/
- **Covers:** (a), (f) strong (per-topic edit). **Does not:** (c), (e), or a people model.

### 3.3 Gemini
See §2. It is the strongest assistant on (c) once Contacts and Daily Brief mature, and the most dependent on a single ecosystem.

### 3.4 Meta AI
- Remembers details from 1:1 chats and uses Facebook and Instagram profile and activity data; **group chats are excluded**; memories can be deleted. [R] https://www.maginative.com/article/meta-ai-rolls-out-new-memory-and-personalization-features/
- **Privacy posture:**
  - Since **16 Dec 2025**, Meta uses AI chat content to personalise ads and feed content, with listed sensitive-topic exclusions.
  - Reported **no opt-out** outside the UK, EU and South Korea.
  - [R] https://www.theregister.com/2025/10/01/meta_ai_use_informs_ads/ ; [R] https://www.tomsguide.com/ai/meta-will-start-using-your-ai-chats-to-target-ads-heres-what-that-means-and-why-critics-like-joseph-gordon-levitt-are-pushing-back
- **Implication:** telling Meta AI about friends feeds an ad system. This is the weakest trust posture among substitutes and a clear counter-positioning opportunity.

### 3.5 Microsoft Copilot (consumer)
- **Fall Release (23 Oct 2025):** long-term memory of events, tasks and goals, **editable and deletable**; Groups of up to 32 people; "Proactive Actions" in preview. [R] https://redmondmag.com/articles/2025/10/27/microsoft-brings-expanded-memo-copilot.aspx ; [R] https://pureai.com/Articles/2025/10/24/Microsoft-Expands-AI-Capabilities-with-Copilot-Fall-Release.aspx
- Microsoft's May 2025 consumer page reportedly says Copilot sends proactive messages based on past conversations, and coverage of the 2025 memory announcement cites remembering birthdays. [W, search-snippet only; the page timed out] https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/do-more-with-ai/general-ai/ai-that-doesnt-just-remember-it-gets-you
- No 2026 consumer-specific memory changes found; the 2026 items found are Microsoft 365 (work) roadmap entries.

---

## 4. Journaling and notes apps

| App | People-relevant features | Proactive? | Cost | Source |
|---|---|---|---|---|
| **Day One** | AI "Daily Chat" (opt-in, guided questions turned into an entry) and "Go Deeper" prompts, in the **Gold** tier (introduced v2026.7, 30 Mar 2026). Some AI runs on-device via Apple Intelligence. **No person-tagging feature found** (only generic tags) | Prompts only | Gold $74.99/yr | [P] https://dayoneapp.com/guides/ai-features/ ; [P] https://dayoneapp.com/releases/2026-7/ ; [R] https://9to5mac.com/2026/04/08/day-one-journaling-app-introduces-gold-plan-with-ai-summaries-and-daily-chat/ |
| **Rosebud** | AI journal with long-term memory across entries; "Ask Rosebud" answers with linked entries (source-grounded); a weekly "Cast of Characters" lists people mentioned. Reported to have a weak sense of time | Weekly report | **Free plan ended 30 Sep 2026**; Bloom $12.99/mo | [W, competitor blog] https://blog.mylifenote.ai/rosebud-review/ (22 Oct 2026) ; [R] https://techcrunch.com/2025/06/04/rosebud-lands-6m-to-scale-its-interactive-ai-journaling-app/ |
| **Mem** | Recommends a "personal CRM" as **one collection per person**, with notes added after each interaction. **Heads Up** surfaces relevant notes before an upcoming meeting. Agent "checks in when something needs you" | Meeting-triggered; custom routines on Pro | Free (25 notes/mo), Plus $9, Pro $29 … Pro 20× $199/mo | [P] https://get.mem.ai/pricing ; [P] https://get.mem.ai/guides/personal-crm-without-crm |
| **Reflect** | Backlinked notes and daily notes; a person can be a linked note; AI chat over notes; E2E encryption | No | about $10/mo | [W] https://toolradar.com/tools/reflect/pricing ; https://costbench.com/software/note-taking/reflect/ |
| **Notion personal CRM templates** | Many free and paid templates: birthday timelines, "last contacted" formula flags (e.g. >3 months), gift trackers | Only via Notion reminders or formulas | Free to a few € | [P] https://www.notion.com/es-es/templates/collections/top-10-paid-personal-crm-templates-in-notion ; [W] https://2sync.com/blog/notion-personal-crm |
| **Obsidian** | Community plugins: **Personal CRM** (infers last contact from [[wikilinks]] in daily notes; per-person contact frequency; Due/Birthdays tabs), Birthday Reminder, Upcoming Birthdays | Frequency-based "due" lists | Free | [P] https://community.obsidian.md/plugins/personal-crm ; [P] https://community.obsidian.md/plugins/birthday-reminder ; [P] https://community.obsidian.md/plugins/upcoming-birthdays |
| **Apple Notes** | Free text; indexed by Siri AI personal context (Notes is a named source) | Via Siri only, on request | Free | [P] https://support.apple.com/en-us/127893 |

**Pattern:** the DIY tools (Notion, Obsidian) default to **frequency reminders** ("haven't contacted in X"), the model Kinship explicitly avoids. AI journals have recall but are self-focused. Mem is the most CRM-like but is priced and positioned for work.

---

## 5. Social platforms and group chats

- **Facebook birthdays:** a long-standing birthday-reminder channel. A 2018 YouGov Galaxy omnibus of 1,076 Australians, **commissioned by Facebook**, found 42% remember birthdays via Facebook notifications. No credible 2025–26 data or official Meta change notice on birthdays or Memories was found. Meta Help Center pages did not load. [W, secondary report of the survey] https://womenlovetech.com/facebook-birthday-stories/
- **Instagram:** no birthday feature found (not verified either way).
- **LinkedIn:** "Days that matter" notifications for birthdays, work anniversaries and new jobs, with "Say congrats" prompts; can be turned off. [W, how-to guides] https://www.guideflow.com/tutorial/how-to-turn-on-in-app-birthdays-notifications-on-linkedin ; https://www.lilachbullock.com/does-linkedin-post-work-anniversary-automatically/
- **WhatsApp:** **birthday notifications for contacts are in testing** (Jul 2026). They read birthdays already saved in the phone's Contacts, with no separate database. Not shipped. [R] https://wabetainfo.com/whatsapp-is-testing-birthday-notifications-for-contacts-on-android/ ; [W] https://www.ubergizmo.com/2026/07/whatsapp-birthday-feature/
- **Group chats and texting as the de facto tool:** Pew (16 Jan 2025; n=6,204 US adults, fielded Sep 2024) finds texting is the leading way people with close friends keep in touch. Women are more likely than men to text, use social media or call a close friend at least a few times a week. A Deseret News summary puts texting at about 6 in 10 weekly or more; that figure is not on Pew's landing page. [R] https://www.pewresearch.org/social-trends/2025/01/16/men-women-and-social-connections/ ; [W] https://www.deseret.com/family/2025/01/16/loneliness-isloation-americans-women-men-pew-research
- Messaging apps hold the raw material (what friends said) but do no remembering. Siri AI is the first assistant to search it, on request only.

---

## 6. Evidence on what people actually do

No high-quality, recent prevalence data was found on how people remember friends' details. What exists:

- **YouGov Galaxy, Dec 2018, Australia, n=1,076, Facebook-commissioned:** 42% Facebook notifications, 38% phone calendar reminders, 24% paper calendar, 22% "don't do anything special and occasionally forget". [W, secondary] https://womenlovetech.com/facebook-birthday-stories/
- **birthdays.app poll (vendor, undated, n>1,100):** 55% "just try to remember", 26% calendar, 9% Facebook. Vendor marketing with no methodology. [W] https://birthdays.app/best-way-to-remember-birthdays
- **Qualitative (Reddit, forums):**
  - Contact-card notes for partner, kids' and pet names [W] (r/LifeProTips links in §1.2).
  - r/ADHD users want an app because of "out of sight, out of mind"; full CRMs are "too complicated". [W] https://redlib.belloworld.it/r/ADHD/comments/1f2h5as/personal_crm_contact_management
  - A GTD forum view: personal CRMs need "a lot of dedication" and are "mostly quite bad". [W] https://forum.gettingthingsdone.com/goto/post?id=139185
- **Attitudes to AI and personal data (2026, mostly secondary write-ups of vendor or industry surveys, methods not checked):**
  - Thales Digital Trust Index 2026: 23% trust companies to use AI responsibly with their data.
  - Shift Browser survey: 48% cite privacy as their top AI concern.
  - [W] https://www.accountsrecovery.net/2026/03/06/new-survey-shows-consumers-want-ai-in-their-lives-but-demand-control/ ; https://forkast.news/64-of-americans-dont-trust-their-ai-assistants-the-agent-revolution-has-a-permission-problem/
  - Use as directional only.

**Inference, not data:** the modal method is "memory plus birthdays in Contacts/Calendar/Facebook", with a minority of high-effort DIY systems. The incumbent is "nothing structured" more than any one product.

---

## 7. Coverage matrix

Key: ● strong · ◐ partial or conditional · ○ none

| Substitute | (a) NL capture | (b) Source-grounded | (c) Event/promise prompts | (d) Real-world action | (e) Close the loop | (f) Correction/consent | (g) Consumer feel | Cost / friction |
|---|---|---|---|---|---|---|---|---|
| iPhone Contacts + Calendar Birthdays | ○ | ○ | ◐ birthdays and anniversaries only, if entered | ◐ Call Context prompt at call time | ○ | ● | ● | Free; manual entry |
| Reminders ("When Messaging", AI suggestions) | ◐ | ○ | ◐ manual promise-to-person | ○ | ○ | ● | ● | Free |
| Siri AI personal context (iOS 27 beta) | ● (voice/text query) | ◐ finds the original message or mail, but there is no saved memory | ○ only on request | ◐ App Actions, tone-matched drafts | ○ (Siri Recap not shipped) | ◐ beta; no memory store to correct | ● | Free; iPhone 15 Pro+; waitlist; English; no EU |
| Apple Journal | ◐ | ◐ own entries | ○ | ○ | ◐ reflective only | ● | ● | Free |
| ChatGPT memory + Scheduled | ● | ◐ memory summary plus response "Sources" | ◐ only if the user schedules it | ● drafting | ○ | ● view, edit, topic controls | ◐ general chat | Free / paid; must remember to tell it |
| Claude memory | ● | ◐ | ○ | ● drafting | ○ | ● per-topic edit, incognito | ◐ | Free / paid |
| Gemini PI + Contacts + Daily Brief | ● | ◐ "explains information used" | ◐ birthday reminders, "people to reach out to" (rolling out) | ● | ○ | ● off by default, temp chats | ◐ | Free (US) to Ultra; Google-only; not EEA/UK |
| Meta AI | ● | ○ | ○ | ◐ | ○ | ◐ delete memories; chats feed ads | ◐ | Free; ad-funded |
| Copilot | ● | ○ | ◐ proactive preview | ◐ | ○ | ● | ◐ | Free / paid |
| Day One / Rosebud | ● (Daily Chat / AI journal) | ● entries are the source | ○ / ◐ weekly report | ○ | ◐ reflection | ● | ● | $75/yr; Rosebud $13/mo |
| Mem | ● | ● notes | ◐ meeting-triggered Heads Up | ◐ | ◐ notes after meetings (manual) | ● | ◐ work-oriented | $9–$199/mo |
| Notion / Obsidian DIY CRM | ○ | ● own notes | ◐ frequency-based | ○ | ◐ manual | ● | ○ high effort | Free to low |
| Facebook / LinkedIn / WhatsApp (testing) | ○ | ○ | ◐ birthdays, work events | ◐ "Say congrats" | ○ | ◐ | ◐ performative | Free; ad-funded |

---

## 8. Where a general assistant could plausibly make a dedicated app redundant

1. **Gemini (Google-ecosystem users, US):** Personal Intelligence (Gmail, Photos, Calendar) + Google Contacts integration (birthday reminders, "people to reach out to", "suggest information to save to a contact") + Daily Brief (a free morning push). If Google adds "notes about this person" and puts contact dates into Daily Brief, it would cover a large share of (a), (c) and (d) with no new app. This is the **most credible redundancy threat**. Status: Contacts integration rolling out (Jun 2026); Daily Brief free in the US (Sep 2026).
2. **Siri AI (iPhone users, i.e. Kinship's platform):** default, free, on-device, already holds Messages, Contacts and Calendar. If Apple adds (i) persistent memory, (ii) proactive relationship moments beyond birthdays and anniversaries, and (iii) Siri Recap linked to contacts, the overlap with Kinship's core loop becomes large. Status: none of (i)–(iii) shipped. Recap announced for Watch S12/Ultra 4 only, beta later in 2026.
3. **ChatGPT for heavy users:** NL capture plus an editable memory summary plus a Scheduled hub. A motivated user can say "remember Sam's mum has surgery on the 12th; remind me the day after to check in". That covers a single promise or event, but only if the user both tells it and asks for the task.

### Strongest counter-evidence (why a dedicated app still has room)
- **No person model anywhere.**
  - Assistants keep account-level memory: ChatGPT a synthesised profile, Claude "topics", Gemini past chats. Users report people facts fragmenting and going stale (OpenAI community, 26 Sep 2026).
  - Google itself notes Gemini struggles with relationship changes (9to5Google, Jan 2026).
- **Proactivity has failed or narrowed.**
  - OpenAI retired Pulse after about 9 months, Pro-only throughout, and moved to user-authored tasks (Engadget, Jun 2026).
  - Google's Daily Brief is deadline- and task-oriented, with no people content documented.
  - Apple's only proactive people prompts are birthday and anniversary banners at call time.
- **Siri has no cross-conversation memory** and is beta, waitlisted, English-only and not in the EU on iPhone (Apple support 127893; iDrop News).
- **Promises and loop-closing are unaddressed.** Reminders' "When Messaging" is the only person-anchored to-do, and it is manual. Siri Recap does not attribute speech or create reminders and auto-deletes after 7 days (Apple support 148354).
- **Trust and consent:**
  - Meta uses AI chats for ads with no opt-out in most regions.
  - Survey write-ups show low trust in AI handling of personal data (directional only).
  - Telling a general assistant about third parties (a friend's diagnosis, a divorce) carries a different expectation than a private, purpose-built place with a "yes" step for sensitive readings.
  - Google explicitly avoids proactive assumptions about sensitive data, which also means it will not proactively help with the moments that matter most.
- **Friction of the DIY path:** forum users describe personal CRMs as needing "a lot of dedication" (GTD forum), and the Notion and Obsidian tools default to frequency nudges.
- **Ecosystem lock:** Gemini's best features need Gmail, Google Calendar and Contacts. An iPhone user with iCloud contacts gets none of the Contacts integration, and Daily Brief doesn't see Apple Calendar or Outlook. [W] https://www.androidcentral.com/apps-software/ai/geminis-daily-brief-drops-its-subscription-fee-heres-what-you-get

---

## 9. Gaps and unverified items
- OpenAI primary pages (release notes, Memory FAQ, the Dreaming post) could not be fetched (403). ChatGPT memory details rest on PCWorld, Engadget and weaker secondary sources.
- Exact iOS 27.2 public release date: MacRumors page headlines (26 Oct 2026) say it was released; not confirmed on an Apple page.
- Gemini Personal Intelligence free-tier global rollout completion; Gemini–Contacts general availability.
- Copilot consumer 2026 state; Microsoft's consumer page timed out.
- Meta and Facebook official birthday/Memories documentation for 2025–26 (Help Center pages didn't load).
- No rigorous survey data on how people remember friends' details. Only the Facebook-commissioned 2018 AU poll, a vendor poll, and Reddit threads.
