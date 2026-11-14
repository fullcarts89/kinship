# Competitive research 01: AI-native and natural-language personal relationship apps

Researched: 1 Nov 2026. Every URL below was seen on 1 Nov 2026 unless another date is given.

**Method and limits.** This report draws on product sites, help and docs pages, App Store and Google Play listings (fetched directly), pricing and privacy pages, Product Hunt and BetaList pages, a GitHub API query and WHOIS. No accounts were created, no waitlists joined and no data entered. **Every conclusion comes from docs, store pages and reviews. None is hands-on.** I searched for public YouTube walkthroughs of YourPond, Keep and Kinu and found none, so no video evidence is cited. App Store version-history entries show no year for the current year; I read those as 2026, and the page shows a full date for older years.

**Evidence labels used throughout**
- **[V-store]**: App Store or Play listing text, version notes, privacy labels, or store screenshots I viewed. Screenshots are still marketing renders, but they show the real UI.
- **[V-docs]**: the vendor's own feature, help, pricing or privacy pages.
- **[V-review]**: a user review that describes actual use.
- **[M]**: a marketing claim on a landing page or launch post, not backed by docs, store UI or reviews.
- **[3P]**: a third-party directory or aggregator. This is the weakest level.

No product here publishes user numbers, retention or revenue, except Dex ("30,000+ users", Dex's own claim) and Fabriq ("Over 1 Million Genuine Connections", Fabriq's own claim, metric undefined). Store rating counts and Play download bands are the only adoption signals I quote.

---

## Summary table

| Product | Status (evidence) | Core capture model | AI understanding of free text | Prompting model | Price |
|---|---|---|---|---|---|
| **Kinu** | Active & GA. iOS 1.4.5 shipped about 27 Oct 2026; Play updated 26 Oct 2026; 100+ Play downloads; 1 App Store rating (1.0★) | Manual person pages, typed notes, voice notes, dates. Optional import from Contacts | **None.** Play listing: private notes "are never used for reminders, suggestions or anything else" | Per-person cadence you set, "rituals", birthdays and dates | Free for 10 people; Plus $6.99/mo, $69.99/yr, $149.99 lifetime |
| **Meadow** (textmeadow.com) | **Waitlist only, likely stalled.** Landing page on GitHub Pages, last pushed 5 Apr 2026; domain registered 5 Apr 2026 | Chat with a **Telegram bot** ("SMS coming soon") | Claimed: extracts names, life updates, interactions **[M]** | Overdue detection, Monday weekly brief, birthdays, drafted first message **[M]** | Free in early access; $8/mo hosted; free self-host with your own Anthropic key **[M]** |
| **YourPond** | Active & GA. iOS 2.8 about 27 Oct 2026; 31 ratings, 5.0★; launched 1 May 2026 | "Describe": a typed or spoken paragraph becomes contact cards. Contacts, LinkedIn, Google and CSV import | **Yes, verified in docs:** extracts names, cities, jobs, family relationships and pets, several people per paragraph, **reviewed before saving**. Model: Anthropic | Birthdays and anniversaries, custom repeating reminders, closeness rating 1–5 drives nudges, natural-language reminders (v1.6) | Free: 25 contacts, 3 Describes a month; Pro $10/mo or $100/yr (100 Describes a month) |
| **Fabriq** | Active, maintenance mode. iOS 3.4.8 on 16 Oct 2026, notes say "Bug fixes"; Play 2.5★ from 270 reviews, 10K+ downloads | Manual entry, up to 150 people in Dunbar circles | **None** | Per-person "touch-base timers", daily shortlist, weekly calendar, conversation starters | $4.99/mo, $39.99/yr |
| **Keep (Keep AI – Personal CRM)** *(discovered)* | Active & GA. v1.1.5 on 11 Aug 2026; first released 27 Sep 2025; 5 ratings, 4.8★ | Dictate or type a note after a call or coffee | **Yes:** people, dates and follow-ups, several people per note, natural-language dates; **review and edit extractions before saving (v1.1.3, Jul 2026)** | **Follow-ups extracted from notes** ("Ask Hannah how the move went"), plus check-in cadence and "who's gone cold" | $7.99/mo, $49.99/yr |
| **Ember (keepember.com)** *(discovered)* | Active & GA, shipping fast. v1.41.0 about 29 Oct 2026; first featured Jul 2026; 3 ratings | Talk or type to "Keeper", an in-app chat assistant; voice notes filed under the right person | **Yes:** routes a sentence into a note, reminder, ledger entry or journal entry; **"Confirm & save" / UNDO** in the store UI | Daily briefing, birthdays, repeating plans, natural-language reminders | Free: 20 contacts; Pro $9.99/mo; Ultra $19.99/mo; tarot reading tickets |
| **Eidra** *(discovered)* | Active, early. v1.1 on 2 Jun 2026; 1 rating | One tap, then speak or type a "story" | Claimed: names, places, interests, follow-ups; profiles reconcile over time; family and pets linked **[V-store]** | Important dates and follow-ups; AI **pre-meeting briefing** that suggests what to bring up | $2.99 or $4.99/mo |
| **Friendful** *(discovered)* | Active, very early. v1.0 on 22 Sep 2026; 1 rating | Profiles, notes and voice notes | Claimed: AI summary per person, connects notes, "open threads" **[V-store]** | Suggested check-ins "based on saved plans and open threads" | $8.99/mo, $56.99/yr |
| Dex *(adjacent, prosumer)* | Active & GA | Syncs email, calendar, LinkedIn, WhatsApp and iMessage; **text Dex by SMS or WhatsApp** | AI classifies notes, drafts messages, voice mode | Cadence per contact (weekly, monthly, quarterly) | $12–$20/mo (annual) |

Also seen, with lighter evidence: **PersonLog** (AI builds profiles from screenshots and voice; scores closeness, "energy" and "growth potential"; $5.99/mo), **Frenzz** (voice logging, AI summaries, "friendship health gauge", streaks; one upvote on Product Hunt), **Echo CRM** (voice-first; launched on Product Hunt 5 Nov 2025 with 4 upvotes; site has no pricing or store links, so likely tiny or dormant), and **Mesh, formerly Clay** (professional-leaning; syncs iMessage with full-disk access). **UpHabit** shut down its personal CRM apps on 9 Apr 2026.

---

## 1. Kinu (kinu.care)

**Sources**
- Site: https://kinu.care/
- App Store: https://apps.apple.com/us/app/kinu-remember-your-people/id6760111924
- Play: https://play.google.com/store/apps/details?id=care.kinu.app
- PeerPush: https://peerpush.com/p/kinu
- BetaList: https://betalist.com/startups/kinu
- Founder blog: https://kinu.care/blog/personal-crm-apps-shut-down

**Status: active and GA.** The company is FRESHLAB d.o.o. in Velenje, Slovenia; the maker is Urh Meza. The FAQ says the App Store launch was July 2026. iOS version history runs from 1.0.1 (8 Jul) to 1.4.5 ("5d ago", about 27 Oct 2026), with about 12 releases in four months. Play was updated 26 Oct 2026 and shows **100+ downloads**. The App Store shows **1 rating, 1.0★, with no written review**. On PeerPush it has 13 upvotes and two 5★ reviews. **[V-store]**

**Important correction to the brief:** Kinu is **not AI-native**. The Play description says: "your private notes are never used for reminders, suggestions or anything else in the app." It also says: "No calendar, no reading your messages, nothing pulled in on its own." **[V-store]** Kinu's relevance is as a **direct competitor on tone**: calm, private, welcoming and consumer-first.

1. **Getting started.** You add people one at a time. The site suggests starting "with your closest handful", and the Play listing says "Start with the ten who matter most." Kinu "can help you add people from your contacts, and that is where it stops." Version 1.3.1 (20 Aug) added import from Files or iCloud. **[V-store]**
2. **Capture.** Typed notes, **voice notes** ("record a voice note when typing is too slow"), dates and photos. Nothing indicates the voice notes are transcribed or parsed. **[V-store]**
3. **Understanding and structure.** None. Content stays as the user wrote it.
4. **Visual representation.** A people list with a short detail line and a group tag, plus a grid toggle. Store screenshot 1 is at https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/58/63/60/58636074-632c-2856-40c9-5ba92257475d/1.jpg/600x1300bb.jpg. There is also a **"Relational Compass"** ("a visual map of your closest relationships"), ordered "by how close you are, not by who texted last" (site). Kinu also uses a "friendship styles" archetype quiz (Opener, Gatherer, Harbour, Hearth). **[V-store / V-docs]**
5. **Bringing things back.** Each person has a cadence you choose ("Choose how often you would like to be in contact with each person"). There are "rituals" such as a Sunday call with parents, and reminders before birthdays and dates. Reminders don't stack up: "Skip one and it goes; nothing piles up, nothing is owed." **[V-store / V-docs]**
6. **Actions beyond reminders.** None. A birthday banner says "A good time to plan something", but Kinu does no planning itself.
7. **After contact.** There is no documented "how did it go" step.
8. **Correction, consent, privacy, export.** Kinu is local-first, with opt-in backup and sync encrypted on the device ("Private by default, encrypted if you sync"). Content is never used for ads or analytics. The App Store privacy label still lists analytics on user ID, product interaction and diagnostics, and the Play data-safety section says some data types may be shared with third parties ("Financial info, App activity and 2 others"). Export is a JSON file from settings (per PeerPush and the site FAQ). A free account sign-in is required.
9. **Manual work.** All of it: adding people, writing notes, setting cadences.
10. **Pricing and target.** Free for 10 people; Plus costs $6.99/mo, $69.99/yr or $149.99 lifetime (€7.99, €79.99, €179.99). The target is privacy-minded people with a small inner circle.
11. **Strengths:** a very calm, anti-gamified voice ("no streaks, no pressure"), strong privacy, rapid iteration, accessibility work (VoiceOver and TalkBack, large text). **Weaknesses:** no intelligence at all, all input is manual, and adoption is tiny (100+ Play downloads, one 1★ iOS rating). **Complaints found:** none written.

**Challenge to Kinship:** (g) a welcoming consumer tone and (f) privacy. Kinu already sounds the way Kinship wants to sound, without AI. It does not challenge (a)–(e).

---

## 2. Meadow (textmeadow.com)

**Sources**
- Site: https://www.textmeadow.com/ (HTML fetched directly)
- Blog: https://www.textmeadow.com/blog/
- GitHub API for `zachmeditates`: https://api.github.com/users/zachmeditates/repos
- WHOIS for textmeadow.com

**Status: early access, waitlist only, with signs of stalling.** The only call to action is "Get Early Access" by email; the page says "We're launching soon. Drop your email and we'll let you know." The page is served from GitHub Pages; the repo `zachmeditates/meadow-site` was **last pushed 5 Apr 2026**, and the HTTP `last-modified` header is 5 Apr 2026. The domain was created 5 Apr 2026. There is one blog post, dated 19 Mar 2026. **I found no product launch, store listing, Product Hunt page, reviews or other public activity in about seven months.** The founder is "Zach". The landing page's "Try it" demo is a scripted widget, not the live product. **Everything below is [M].**

1. **Getting started.** You join with an email; the bot then runs in **Telegram** ("Works through Telegram today. SMS and more coming soon"). You don't install a new app. The site says the team chose Telegram "because it allows rich interactions without needing you to install a separate app."
2. **Capture.** Free-text chat in natural language, such as "Grabbed coffee with Sarah. She got the promotion!" or "Had lunch with Marcus yesterday. He and Dana are expecting in October." Voice is not mentioned.
3. **Understanding and structure.** Claimed: "pulls out the names, the details, and the context automatically". It logs the interaction, updates the person's life events and sets a follow-up: "I'll remind you to congratulate her next week." It claims to extract several facts from one message. There is no evidence of real behaviour.
4. **Visual representation.** The chat is the primary surface. A web dashboard shows each person's "living profile" (fields: last seen, works at, life updates, how you met, birthday) and a "relationship map".
5. **Bringing things back.** "Overdue detection" is a cadence-style mechanic ("Sarah Kim, 5d overdue"). There is a **weekly brief every Monday** (who is overdue, what to talk about, a drafted message, birthdays this week), plus birthday alerts and "surprise reconnects". The demo also shows **event-based follow-ups** ("remind you to congratulate her").
6. **Actions beyond reminders.** It "writes the first message for you", which you then send yourself. There are also on-demand "person briefs".
7. **After contact.** You text it ("Grabbed coffee with Sarah…") and it logs the interaction, so closing the loop depends on the user telling it. It does not ask how things went.
8. **Correction, consent, privacy, export.** Each account gets an "isolated database". The site says: "Your data is never used to train AI, sold, or shared. Period." Sensitive fields are encrypted at rest, and export is JSON or CSV. The self-host option requires "your own Anthropic API key", which indirectly discloses the model vendor. No correction or consent flow is described.
9. **Manual work.** The user must remember to text it after interactions. There is no automatic ingestion.
10. **Pricing and target.** Free in early access; **$8/mo** hosted; free self-hosted with Docker and your own key. The self-host option points to a technical early adopter.
11. **Strengths:** the most direct statement of "text it like a friend, it acts on your data" in this set. The demo hits (a), (c) and (d) together. **Weaknesses:** apparently unlaunched; requires Telegram, which few US consumers use; frequency language ("5d overdue") leads the brief. **Complaints:** none, because there are no users to be found.

**Challenge to Kinship:** high **on concept** for (a) conversational capture, (c) event follow-ups and (d) drafted outreach. **Proof is near zero**, though; treat it as a signal that the idea is obvious to indie builders, not as a shipped competitor.

---

## 3. YourPond (yourpond.io)

**Sources**
- Site: https://www.yourpond.io
- Features: https://www.yourpond.io/features
- Pricing: https://www.yourpond.io/pricing
- Service providers: https://www.yourpond.io/service-providers
- Privacy post, 18 Apr 2026: https://www.yourpond.io/blog/a-note-on-your-privacy
- App Store: https://apps.apple.com/app/id6761669539
- AlternativeTo: https://alternativeto.net/software/yourpond/about

**Not to be confused with** "Pond", a YC Summer 2025 AI messaging app (https://www.ycombinator.com/companies/pond).

**Status: active and GA, shipping weekly.** It runs on iOS and the web; the developer is LilyPadLabs LLC (Emily Rose Hyeamang). v1.0 shipped **1 May 2026**, and v2.8 shipped "5 days ago" (about 27 Oct 2026). There were about 17 releases in six months. **31 ratings, 5.0★.** **[V-store]**

1. **Getting started.** Bulk import from the iPhone address book (with photos), or contacts from LinkedIn, Google or any CSV. You can also use "Describe" or manual entry. Contact details can be swapped by QR code ("LilyPad"; codes expire after one hour). v2.7 (17 Oct) added new onboarding. **[V-docs / V-store]**
2. **Capture.** You **type or speak a paragraph**. Web voice is transcribed by OpenAI; iOS uses Apple speech recognition. Separately, you can log "Moments" (trips, weddings, dinners) and tag who was there. **[V-docs]** A reviewer says "the voice feature helps log names quickly" (App Store review, 27 Sep). **[V-review]**
3. **Understanding and structure: verified in docs.** Describe extracts names, cities, jobs and employers, how you met, family relationships (parent, sibling, sibling's spouse), pets and small details. The demo shows **several people from one paragraph**, each becoming its own card. The features page says: **"you review everything before it's saved."** "YourPond never stores the raw text you type, only the contacts you review and approve." v1.8.3 (5 Sep) fixed "Describe review and contact matching", which confirms a review step and matching to existing contacts. **However, the model is contact attributes, not conversations:** it builds a rich address book and family tree, and has no record of what was said or promised. Because the raw text is discarded, **nothing can be traced back to its source**. **[V-docs / V-store]**
4. **Visual representation.** A gamified home screen with counts (233 people, 56 places, 5 moments), an "Up Next" list and "Recent Moments". There is a **map** of where people live ("Your Places"), a **"Pond Passport"** of stamps and a bucket list, a **family tree**, **"Ripples"** (a network graph of clusters and bridges, Pro only), **"Connections" scores** ("76 · Deeply connected"), a profile **completeness score**, an **Insights** analytics view (Pro), badges and a frog mascot. Store screenshot: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/f6/0e/d2/f60ed29e-e623-5b23-432d-8adc50a603a8/01-hook.png/600x1300bb.jpg. **[V-store / V-docs]**
5. **Bringing things back.** Birthday and anniversary reminders are generated automatically (iOS push or web email). Custom reminders repeat daily, weekly, monthly or yearly. **"YourPond Care"** asks five one-tap questions a day, and a **closeness rating of 1–5 sets "how often YourPond nudges you"**. v1.6 (6 Aug) added natural-language reminders, and v1.7.3 added a "Care streak". The model is cadence plus dates, **not events drawn from conversations**. **[V-docs / V-store]**
6. **Actions beyond reminders.** **Gift tracking:** ideas, gifts given, gifts received, and a **thank-you reminder** created when you receive a gift. Lists support bulk actions, and profiles have quick actions (call, message, email). It does not draft messages or make plans. **[V-docs]**
7. **After contact.** You can log a Moment. It never asks how something went.
8. **Correction, consent, privacy, export.** Extractions are reviewed before saving **[V-docs]**. Anthropic (Claude API) processes Describe text and may keep it up to 30 days for safety; the site says "We will never use your data to train AI models." Sensitive fields are encrypted, export is **JSON for the full account or CSV for contacts**, and account deletion is available. The App Store privacy label lists contact info "not linked" to you being used for "developer advertising or marketing", which sits awkwardly beside the no-ads messaging. The service-providers page lists 13 processors. **[V-docs / V-store]**
9. **Manual work.** Running Describe now and then, logging moments, answering the daily Care questions, rating closeness. Free accounts get only **3 Describes a month**, so in practice free users enter people by hand.
10. **Pricing and target.** Free: 25 contacts, 3 Describes a month. **Pro: $10/mo or $100/yr** (IAP $9.99 and $99.99), with 100 Describes a month, Ripples and Insights. The target is socially busy consumers (parents, travellers, connectors); there are also "for founders" landing pages.
11. **Strengths:** the most polished consumer AI-capture flow in this set that is actually shipping, with review-before-save, multi-person extraction and a disclosed model vendor. It ships very fast and has warm reviews ("Great for remembering both kids and parents names", 1 Oct; "No more random phone notes!", 15 Jul). **Weaknesses:** it **quantifies relationships** (connection scores, completeness score, closeness ratings, streaks, badges, counts); it has no conversation memory or source trail; capture is capped behind the paywall; the gamification may feel like a game rather than care. **Complaints:** none found. All four visible reviews are 5★, from a small, early sample.

**Challenge to Kinship:** **(a) partly** (natural-language capture of people, with multi-person extraction) and **(f) partly** (review before save, privacy-first, export). It also directly challenges **(g)** as a warm, playful consumer brand. It does **not** do (b), (c), (d) or (e).

---

## 4. Fabriq (ourfabriq.com)

**Sources**
- App Store: https://apps.apple.com/us/app/id1460143202
- Play: https://play.google.com/store/apps/details?id=com.ourfabriq
- Sites: https://ourfabriq.com/ and https://ourfabriq.com/fabriq
- Kinu's graveyard post (for status history): https://kinu.care/blog/personal-crm-apps-shut-down

**Status: active, in maintenance mode.** The developer of record is Sowlutions Inc.; the copyright line reads "© 2021 Social Fabriq, Inc". iOS 3.4.8 shipped **16 Oct 2026**, with 3.4.7 on 6 Oct and 3.4.6 on 25 Sep, all noted "Bug fixes". Play was updated 19 Aug 2026. Ratings: **iOS 4.0★ from 165; Play 2.5★ from 270 reviews, 10K+ downloads.** The website still dates from about 2021–22, with some assets served from a raw IP address. **No AI features anywhere.** **[V-store]**

1. **Getting started.** Mostly manual. The site says it "may ask to access your device's contacts", but a Play reviewer on 1 Sep 2026 says: "You can't import contacts, each one must be manually entered." You add up to 150 people into four **Dunbar circles** (inner about 5, middle about 10, outer about 35, extended about 100). **[V-docs / V-review]**
2. **Capture.** Typed notes and "reflections" about interactions, plus life-event reminders.
3. **Understanding and structure.** None.
4. **Visual representation.** Circles of closeness, people shown with **"touch-base timer" rings that count down from green to red**, a daily shortlist and a weekly connection calendar. It also tracks "how often you connect and the quality of those connections". Store screenshots: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource124/v4/48/ed/6a/48ed6a33-7b7d-2e1a-bbeb-feb70e665dba/a7d3691b-8abd-4141-8efb-ff724dc19d47_9_1125x2436.jpg/600x1300bb.jpg and https://is1-ssl.mzstatic.com/image/thumb/PurpleSource114/v4/48/c2/c6/48c2c6d7-e663-53ad-f5d1-b17075bc6658/109f6842-491d-4491-9183-7d8a709d5e39_1_1125x2436.jpg/600x1300bb.jpg. **[V-store]**
5. **Bringing things back.** Pure **frequency goals** ("set goals to reconnect regularly"), plus recurring check-in notifications and life-event reminders.
6. **Actions beyond reminders.** "Conversation starters" ("Meme or heartfelt message?"), which appear to be static or curated rather than personal.
7. **After contact.** You log a connection and its quality. A 2019 review asked for notes on the log and a history of past conversations.
8. **Correction, consent, privacy, export.** No ads; "We don't sell your data." The Play data-safety section says **"Data isn't encrypted"** and that data "may be shared with third parties: Messages and App info and performance", while also saying "No data collected". These statements contradict each other. No export is documented.
9. **Manual work.** Everything: entry, logging and quality ratings.
10. **Pricing and target.** $4.99/mo or $39.99/yr. The target is "social wellness" consumers.
11. **Strengths:** a long-lived brand, a psychology framing (Dunbar) and a scale band of 10K+ Play downloads. **Weaknesses and complaints (Play):** "very glitch[y]… notifications don't work outside the app… emailed their support team 2 weeks ago and got nothing back" (Matt Malan, 1 Sep 2026); "the app no longer works on my android... it crashes" (Morris Fields, 3 Jun 2026). An older request asks for custom circles (2020). Third-party directories had wrongly marked it discontinued, which Kinu's post corrected.

**Challenge to Kinship:** low. Fabriq is the **frequency-target, quantified model** that Kinship's differentiator (c) is defined against. Its user base shows there is demand for "help me stay in touch".

---

## 5. Keep (Keep AI – Personal CRM), discovered

**Sources**
- App Store: https://apps.apple.com/us/app/keep-ai-personal-crm/id6751458016
- Site: https://getkeep.xyz
- Privacy: https://getkeep.xyz/privacy.html

**Status: active and GA on iPhone only (iOS 26+, plus Mac and Vision).** It is a solo developer (Björn Schefzyk). v1.0 shipped 27 Sep 2025 and v1.1.5 on **11 Aug 2026**, with about 16 releases. **5 ratings, 4.8★.** **[V-store]**

1. **Getting started.** Manual, by business-card scan (v1.1.1), or by simply naming people in notes. The privacy labels list Contacts, which suggests contacts access.
2. **Capture.** You **dictate or type** a note after a call or coffee. Voice keeps recording if you switch apps or take a call (v1.1.4). Store screenshot of a note: "Just had a quick Zoom catch up, he is thinking about accepting an offer… We said let's have coffee in two weeks." **[V-store]**
3. **Understanding and structure: the strongest verified evidence in this set.** The AI extracts "people, dates, and follow-ups, preferences, family details, and gift ideas". **"One rambling note about three people"** produces separate entries for each person. Natural-language dates ("next Friday", "before the launch") become reminders. **v1.1.3 (Jul 2026): "Review/edit AI extractions before saving."** v1.0.7 added a choice of Claude, GPT or Gemini, which exposes model choice to the user. **[V-store / V-docs]**
4. **Visual representation.** A people list sortable by activity or "catch-up need", **one timeline per relationship**, and an **"Up Next"** list split into Overdue, Next 7 Days, Events and Reminders. Screenshot: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c2/50/3f/c2503f55-b1d6-cf90-5368-855f20eb54fd/02_03-follow-ups_keep_app_store_iphone_en.png/600x1300bb.jpg. **[V-store]**
5. **Bringing things back.** **Prompts come from what you said.** The Up Next screenshot shows "Send Priya the restaurant recommendation", **"Ask Hannah how the move went"**, "Share the article with Hannah" and "Call Mom this weekend". It also has check-in cadences, a "silence detector" (v1.0.7), "sort by who's gone cold", and birthdays a week ahead. v1.1.5 moved past events into a "Past" section instead of leaving them "Overdue". **[V-store]**
6. **Actions beyond reminders.** It "surfaces the next action, including what to say and when to reach out" **[M]**. Style controls for tone, length and wording (v1.1.3) suggest generated text. Drafting is not explicitly documented, and it does not book or buy anything.
7. **After contact.** Follow-ups like "Ask Hannah how the move went" are **loop-closing prompts generated from an earlier note**, but they depend on the user writing a new note afterwards. Nothing suggests it asks "how did it go?" by itself.
8. **Correction, consent, privacy, export.** Review and edit before saving (v1.1.3), with all content editable (v1.0.5). It is local-first with encryption at rest; "AI is used to structure notes rather than store them"; there are no accounts. **Markdown and CSV export** arrived in v1.0.8. No sensitivity or consent handling is documented beyond review.
9. **Manual work.** The user still has to start each note, but speaking for about 10 seconds is the whole job.
10. **Pricing and target.** $7.99/mo or $49.99/yr. **It explicitly targets both personal and professional users**: the site names sales reps, founders, freelancers, consultants and investors. Of four visible reviews, one is "Light CRM for sales rep" and one says it helps them "check in with friends" (27 Sep 2025).
11. **Strengths:** verified multi-person extraction, event and promise follow-ups, review before saving, export, privacy. **Weaknesses:** a utilitarian, task-list feel; a sales-tool positioning; model choice shown to the user; iOS 26+ only; tiny adoption. **Complaints:** none visible.

**Challenge to Kinship: the highest of all products here.** It already ships (a) voice capture with little manual input, (c) **prompts drawn from real events and promises in notes**, and a partial (f) review-before-save. That is strong evidence (store screenshots plus version notes). It is weaker on (b) (the timeline keeps notes, but tracing facts to their source is not documented), (d), (e) and (g).

---

## 6. Ember (keepember.com), discovered

**Sources**
- Site: https://keepember.com
- Privacy: https://keepember.com/en/privacy (updated 18 Oct 2026)
- App Store: https://apps.apple.com/us/app/id6770759791
- Play: https://play.google.com/store/apps/details?id=com.hxh.ember
- Product Hunt: https://www.producthunt.com/p/ember-relationship-keeper/ember-0897a07b-139c-478a-baf7-ed63c2fc7139
- BetaList: https://betalist.com/startups/keepember

**Do not confuse** with "Ember: AI Relationship Coach" (a couples app, id6744977130).

**Status: active and GA, shipping very fast.** The maker is Công Vũ Đăng (Hactory, Vietnam). Version history runs from 1.7.0 (16 Jul) to 1.41.0 (about 29 Oct 2026). **3 ratings, 5.0★.** The current store name is **"Ember: Astrology, Tarot, AI"**: it has drifted from a relationship keeper into a **general life organizer** (journal, finance ledger, subscriptions, habits, tarot, birth charts). **[V-store]**

1. **Getting started.** Contacts with profile pages, an "Inner Circle", two-way relationship links (partner, parent, child) and groups. Contacts can be shared by end-to-end encrypted QR code. **[V-docs]**
2. **Capture.** "Speak or type the way you normally talk" to **Keeper**, the in-app assistant. Voice notes: "mention the person's name. Keeper tags the right person and writes a tidy summary." It also scans receipts. **[V-docs]**
3. **Understanding and structure.** Keeper "recognises a reminder, a payment, a journal line or a question, then drafts it in the right place **for you to confirm**." The store screenshot shows chat bubbles with structured results, **"Confirm & save"** buttons and **UNDO** chips. The examples are mostly reminders and finance; person facts are less prominent. Screenshot: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/8f/d5/ea/8fd5eaf2-2e1d-cb60-dcd4-bbaca58222c7/04-keeper.png/600x1300bb.jpg. **[V-store]**
4. **Visual representation.** A customizable tile home screen, person profiles with sections (sizes, food, banking, documents, health), a **"warmth" indicator** for close contacts, and a chat surface (Keeper). **[V-store / V-docs]**
5. **Bringing things back.** "Today's briefing" ("who to check in with and the dates that matter this week"), birthdays and anniversaries, repeating plans, and natural-language reminders ("Remind me to check in with Minh after his interview"). Recency questions are answered from interaction-log timestamps (maker's answer on Product Hunt). **[V-docs / M]**
6. **Actions beyond reminders.** Wishlists per person, a **"Set a gift reminder?"** prompt, a money and gift ledger, and an **MCP endpoint and ChatGPT/Claude connector** where "every write needs your confirmation". No message drafting is documented. **[V-docs]**
7. **After contact.** Not documented beyond the interaction log.
8. **Correction, consent, privacy, export.** Confirm and undo on writes **[V-store]**. End-to-end encrypted sync with "a passphrase only you hold" (servers in Singapore). **However, the privacy policy names OpenAI, Gemini, DeepSeek (China) and Anthropic, sometimes via OpenRouter.** Training is avoided only "where supported". The website and app carry **Meta Pixel, TikTok Pixel, Meta SDK and Firebase**, and the App Store label lists "Data used to track you: Purchases, Identifiers, Usage Data". Export and delete are in settings. **[V-docs / V-store]**
9. **Manual work.** Talking to Keeper; the system is low-friction but it is a general assistant.
10. **Pricing and target.** Free: 20 contacts, 5 "Ember Points" a day. Pro $9.99/mo or $79/yr. Ultra $19.99/mo or $179/yr. Tarot "Reading Tickets" cost $1.99 to $14.99. The target is broad: Southeast Asian consumers interested in self-tracking and astrology.
11. **Strengths:** the best **confirm and undo** pattern for AI writes in this set; voice capture with person tagging; very fast shipping. **Weaknesses:** scope sprawl (tarot, finance), so it no longer reads as a relationship product; ad-tracking SDKs alongside "even Ember can't read it" messaging; many AI providers including DeepSeek. **Complaints:** none (very few reviews).

**Challenge to Kinship:** a pattern-level challenge to (f), since confirm-before-write is shipped in the UI, and partly to (a). Not a focused competitor.

---

## 7. Eidra, discovered

**Sources**
- App Store: https://apps.apple.com/us/app/id6763976011

**Status: active, early.** v1.0 shipped 10 May 2026 and v1.1 on 2 Jun 2026, so there has been **no update for five months**. 1 rating, 5.0★. The developer is Mikel Whiting (BW96 Studios). **[V-store]**

1. **Getting started.** "Tap once, then speak or type about a person."
2. **Capture.** A voice "story". The store copy says "Ramble naturally — who you met, where, what you picked up on." Screenshot: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/8e/5c/48/8e5c48ae-0d3c-9ba5-8d55-0641f3bbacd6/03-capture-1242x2688.png/600x1300bb.jpg
3. **Understanding and structure.** Extracts names, places, interests and follow-ups. "Living contact cards" reconcile over time, and family, pets and connections are linked. It merges duplicates. **[V-store]**
4. **Visual representation.** Contact cards plus an "Ask" natural-language Q&A ("when did I last see…").
5. **Bringing things back.** An important-dates calendar (birthdays, anniversaries, follow-ups) with an optional two-day heads-up.
6. **Actions beyond reminders.** **30-second AI "Briefings" before a meeting**, with a "Want to" list of suggestions. Screenshot example: "Congratulate her on the Senior PD promotion", with the text "it might be worth asking how the new designers are working out". Users can write custom prompts. Screenshot: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/51/15/42/511542d8-ce54-8023-fb66-542b06c8e5e5/04-briefing-1242x2688.png/600x1300bb.jpg. **[V-store]**
7. **After contact.** Capture again; no check-back is documented.
8. **Correction, consent, privacy, export.** Hidden contacts behind Face ID. "Audio is deleted after transcription"; AI runs server-side "without training on user data". Review before saving and export are not documented.
9. **Manual work.** Starting each capture.
10. **Pricing and target.** Casual $2.99/mo (20 captures a day); Business $4.99/mo. It targets personal use **and** sales, founders, recruiters and investors.
11. **Strengths:** briefings that suggest **what to bring up**, which nears (c) and (e). **Weaknesses:** stalled since June, minimal adoption, business-leaning.

---

## 8. Friendful, discovered

**Sources**
- App Store: https://apps.apple.com/us/app/id6758516896

**Status: active, very early.** v1.0 shipped 22 Sep 2026 and v1.0.1 on 30 Sep 2026. 1 rating, 5.0★. The developer is Sophia Carina Graf. **[V-store]**

- **Capture:** profiles with details, life updates, conversation notes, birthdays, gift ideas, plans, follow-ups and voice notes.
- **AI:** organizes information across notes, writes a **summary per person**, and answers questions about a person or about friendship in general. The store screenshot shows **"Ask AI" and a sparkle "SUMMARY" card**. The AI is visible as a badge, which Kinship avoids.
- **Prompts:** "suggested check-ins based on saved plans and **open threads**", plus "Upcoming" events such as "Important Presentation, in 3 days". This is conceptually close to (c). **[V-store]** Screenshot: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/10/e6/63/10e6633e-a734-a3a3-d215-b846603f6007/Frame_1707479081.jpg/600x1300bb.jpg
- **Actions:** a "Message" button and a "Check-In" button on each profile.
- **Price:** $8.99/mo or $56.99/yr; AI usage limited on the free tier.
- **Privacy label:** "Used to track you: Usage Data".
- **Target:** consumer friendships ("Your AI for closer friendships").
- **Verdict:** a consumer-tone, AI-forward concept very close to Kinship's, but with **no traction evidence**. It does challenge (c) and (g) on paper.

---

## 9. Adjacent and lighter-evidence products

- **Dex** (https://getdex.com, with machine-readable context at https://getdex.com/llms-full.txt). Active; founded 2019; claims "30,000+" users (Dex's own figure).
  - Syncs email, calendar, LinkedIn, **WhatsApp and iMessage**.
  - An **"SMS/text-message interface ('message Dex like a friend')"** for logging notes and reminders.
  - AI Assist drafts messages; "AI auto-classifies note type"; voice mode (Professional plan).
  - Keep-in-touch cadence is "weekly, monthly, quarterly".
  - Pricing: Premium $12/mo and Professional $20/mo (annual).
  - Target: networking professionals ("anyone who believes their network is their net worth").
  - **Evidence [V-docs].** It challenges (a) through texting and passive ingestion, and (d) through drafts. It is not a consumer warmth play.
- **PersonLog** (https://apps.apple.com/us/app/-/id6757311017). v2.0.1 (4 May 2026) added AI profiles "from screenshots & voice" and "Message Assist" reply suggestions. It **rates "closeness, energy, and growth potential"**. $5.99/mo or $49.99/yr; 5 ratings; last update 10 May 2026. **[V-store]**
- **Frenzz** (https://www.producthunt.com/p/frenzz-friendship-reminder/frenzz). Product Hunt only, posted about 7 months ago. Voice logging with live transcription, AI conversation summaries, starters "based on your shared history", a **"friendship health gauge"**, a radar view and streaks. On-device with no accounts. One upvote. **[M]**
- **Echo CRM** (https://useechocrm.com and https://www.producthunt.com/products/echo-crm). Launched on Product Hunt 5 Nov 2025: "the first personal CRM that listens to you". Voice commands like "Sarah said she loves pizza". No pricing or store links; 4 upvotes. **Probably dormant or tiny.** **[M]**
- **Mesh, formerly Clay** (https://clay.earth / me.sh). A personal relationship manager that syncs iMessage (requires full-disk access) and has the "Nexus" AI search. Professional-leaning. Pricing: Free; Pro $10/mo (annual). **[3P]**, via Dex's list at https://getdex.com/blog/personal-crm-list/ (updated 7 Jul 2026) and https://use-apify.com/blog/clay-personal-crm-review-2026.
- **Market churn.** UpHabit "made the difficult decision to close down the web and mobile apps" on 9 Apr 2026. Nat, Keep My Friends, Garden and Amicu are dormant. Moments pivoted to a general AI assistant (v2.0, 21 Apr 2026). Source: https://kinu.care/blog/personal-crm-apps-shut-down (25 Jul 2026, updated 16 Sep 2026), corroborated by Dex's list.
- **Text-message AI assistants** such as Poke, Orchid, Sidekicks and Pally. These are general assistants living in iMessage or SMS, and some remember birthdays, but none is relationship-specific (TechCrunch, 8 Apr 2026: https://techcrunch.com/2026/04/08/poke-makes-ai-agents-as-easy-as-sending-a-text/). They show that **"text an AI and it remembers" is becoming a mainstream pattern**, which lowers how novel conversational capture alone looks.

---

## Differentiator check

| Kinship candidate | Who already does it, and how well | Evidence strength | Verdict |
|---|---|---|---|
| **(a) Conversational capture, minimal manual input** | **Keep** (dictate a note; multi-person extraction of people, dates and follow-ups); **YourPond** (Describe paragraph to several contacts, but capped at 3 a month on free); **Ember** (Keeper chat and voice); **Eidra** and **Friendful** (voice stories); **Dex** (text by SMS or WhatsApp plus passive sync); **Meadow** (Telegram chat, unlaunched) | **Strong**: Keep and YourPond have store screenshots and version notes; Ember has a store screenshot. Eidra and Friendful are [V-store] copy only. Meadow is [M] | **Common.** Not a differentiator by itself; quality and warmth of the capture would be. |
| **(b) Source-grounded memory (each fact traceable to what you said)** | **Nobody documents it.** YourPond explicitly **discards the raw text** after review. Keep keeps notes on a per-person timeline, so the source may be next to the facts, but no fact-to-source link is shown. Ember and Eidra make summaries | Absence of evidence (docs and stores) | **Open.** The strongest remaining differentiator. |
| **(c) Prompts from real events, promises and unfinished conversations, not frequency targets** | **Keep** does it: Up Next shows "Ask Hannah how the move went" and "Send Priya the restaurant recommendation", taken from notes. **Friendful** claims check-ins "based on saved plans and open threads". **Eidra** briefings suggest what to bring up. **Meadow** demo: "I'll remind you to congratulate her next week". Most of these **also** use cadence or "gone cold" mechanics. Fabriq, Kinu, YourPond and Dex are cadence-first | **Keep: strong** (store screenshot plus v1.1.5 notes). Friendful and Eidra: moderate [V-store]. Meadow: [M] | **Partly offered and shipping.** Kinship can't claim it is unique; it can claim to lead with it and drop frequency targets entirely. |
| **(d) Help taking real-world action** | Drafting: **Dex** (AI Assist), **Meadow** ("writes the first message", [M]), **PersonLog** (Message Assist). Gifts: **YourPond** (gift tracking plus thank-you reminders), **Ember** (wishlists and gift reminders). Booking, buying or planning: **nobody** | Drafts: [V-docs] for Dex, [M] for Meadow. Gifts: [V-docs] | **Partly.** Drafting and gift lists are common; real-world execution (plans, bookings, sends) is open. |
| **(e) Closing the loop after an interaction** | **Nobody asks "how did it go?"** Keep's follow-ups ("Ask Hannah how the move went") close the loop on the *other person's* event. Meadow logs an interaction when you text it. Fabriq logs connection quality by hand | Weak or indirect | **Mostly open.** |
| **(f) Trustworthy correction, consent and user control** | **Keep** (review and edit extractions before saving, all content editable, export, local-first); **YourPond** ("you review everything before it's saved", JSON and CSV export, named AI vendor, no training); **Ember** (Confirm & save plus UNDO, end-to-end encryption, but tracking SDKs and DeepSeek). **No one documents handling of sensitive information** (health, conflict, third-party secrets) or consent per sensitive reading | Review before saving: **strong** (docs plus version notes). Sensitive consent: absent | **Review before saving is table stakes now.** Graded consent for sensitive or ambiguous readings is open. |
| **(g) Welcoming consumer (not business) experience** | **Kinu** (calm, anti-streak, private, but no AI); **YourPond** (warm, playful, mascot, but quantified and gamified); **Friendful** (warm look, but sparkle AI badges). Keep, Eidra and Dex court sales and founders. Ember has sprawled into tarot and finance | Strong for Kinu and YourPond (store UI) | **Contested on tone, not on the combination.** No shipping product pairs a non-quantified, non-gamified, AI-invisible consumer experience with real conversational understanding. |

**Bottom line for strategy**
- The pieces of Kinship's thesis exist separately in small indie apps launched in 2025–26. **Keep** is the closest functional match: voice capture, follow-ups drawn from notes, review before saving. **YourPond** is the closest shipping consumer AI-capture product. **Kinu** is the closest in tone.
- All of them have tiny verified adoption: 1 to 31 App Store ratings, and Kinu has 100+ Play downloads. The only scaled names are cadence-based or professional (Fabriq with 10K+ Play downloads, Dex with a self-claimed 30,000+ users).
- Open ground: **(b)** traceability to source, **(e)** asking how it went and capturing what came out of it, **(d)** help that goes past a draft, **consent for sensitive information** within (f), and the **combination** with (g).
- A caution: "text it like a friend" (Meadow, Dex, general iMessage agents) and "speak a note, AI files it" (Keep, Ember, Eidra, YourPond) are now **familiar patterns**, so they shouldn't be the headline claim.
