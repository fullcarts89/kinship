# 05 — Why personal relationship apps disappoint users and struggle commercially

Research date: 1 Nov 2026. Status: **research evidence, not a product decision.** Counts are voices I actually read. They do not estimate how common a problem is in the population.

## 0. Method, coverage and limits (read first)

| Source type | What I actually read | How |
|---|---|---|
| Hacker News | Launch HN Dex (Aug 2019, 141 comments); Monica (Dec 2020, 198); Show HN Nat (Oct 2020, 119); Show HN Nat.app (Mar 2022, 39); Ask HN "tarpit?" (May 2024); Ask HN Personal CRM (Sep 2024); Ask HN "How useful" (Sep 2021); Show HN Poppy (Mar 2026, 126); "We are rebuilding Monica" (Aug 2026, 97); comment search hits | `hn.algolia.com` API, full comment trees. The Monica 2020 tree was read to about 80%. |
| Reddit | r/productivity (52 posts mentioning "personal crm", ~10 threads read in full), r/ObsidianMD (25 posts; the 51-comment "better friend" thread read in full), r/ADHD (33 "keep in touch" posts plus 2 "personal CRM" posts; 5 threads read), r/SaaS, r/PKMS, r/startups (1 thread each) | Arctic Shift archive API (reddit.com blocks fetching). Archive gaps are possible and removed posts are blank. r/socialskills, r/introvert and r/iphone returned nothing usable (API timeouts or no hits). |
| App Store (US) | Every text review the public RSS feed returns: Dex 43, Mesh/Clay 82, Fabriq 113, Covve 152, Garden 29, CatchUp 11, YourPond 18, Amato 8, FollowUp 8, Dear 6, Hippo 2, Kinu 0 | iTunes RSS plus Search API metadata (rating counts, last update, prices). Individual reviews have no permalinks, so each is cited as app page + date + review title. |
| Google Play | **Not obtained.** The Play page did not render through the fetch tool. | Gap. |
| Press, blogs, founders | The Atlantic (Nov 2019), Axios (Aug 2019), The Hustle, Elle Morrill (2018), Monica founder posts (2022, 2023, 2026), Mesh rename post (2026), Automattic acquisition post (2025), Shikhar Sachdev Substack (Jun 2026), Product Hunt maker post (Vellaci), Trustpilot (Clay), Dex's competitor "graveyard" list (Jul 2026), Troy Hunt (Covve breach) | WebFetch / WebSearch. |
| Podcasts and tweets | **Not covered.** | Gap. |

Biases to keep in mind:
- HN skews technical and privacy-sensitive, so privacy counts there are inflated relative to mainstream users.
- App Store text reviews skew negative for bigger apps (Dex 25 of 43, Mesh 55 of 82 are 1–2 stars).
- YourPond's 18 reviews are all 5-star and cluster on launch days (7 May and 24–26 Sep 2026). Read them as early-adopter or friends-and-family signal.
- Reddit threads in this space are flooded with founders promoting their own apps. In r/SaaS 1ouhrao, most replies are pitches. That flood is itself a finding (§3).
- Several named products have **no user-review evidence at all**: Meadow (textmeadow.com is pre-launch, "We're launching soon"), Kinu (0 US text reviews, 1 rating), hey! (no ratings shown), Dunbar148 (0 ratings), Poppy app (4 ratings), Hippo (2 reviews). I could not confirm a friend-focused app called "Keepsake". Absence of complaints about these products means no data, not satisfaction.

Evidence labels used below:
- **REPEATED**: the problem appears in at least 4 independent venues from at least 3 different source types.
- **MODERATE**: 2–3 venues, or many voices concentrated in one source type.
- **ISOLATED**: 1–2 voices.

---

## 1. Problem tally, ranked by evidence strength

### 1.1 Manual maintenance and data entry, including import and dedupe cleanup — REPEATED (strongest)
**About 20 independent venues and about 40 individual voices.** This is the most consistent complaint across every source type.

Two distinct forms appear:
- **(a) Logging burden.** Tools need you to type notes after every interaction.
- **(b) Clean-up burden.** Auto-import tools (Clay/Mesh, Dex, Covve) shift the work into fixing duplicates, failed merges and wrong imports. Automation did not remove maintenance; it changed its shape.

Representative quotes:
- "data entry was too hard/complicated" — rodolphoarruda, Launch HN Dex, 14 Aug 2019, https://news.ycombinator.com/item?id=20701018
- "Every CRM I've looked into seems to revolve around a lot of manual work." — kilroy123, same thread, https://news.ycombinator.com/item?id=20700317
- "seemed too daunting a task to keep it up to date" — the-peter, https://news.ycombinator.com/item?id=20708314
- "It's such a pain to record everything which is why I never used it" — HaloZero, HN "We are rebuilding Monica", Aug–Sep 2026, https://news.ycombinator.com/item?id=49524894
- "I have better things to do than keeping logs up to date." — wolvoleo, Show HN Poppy, Mar 2026, https://news.ycombinator.com/item?id=47259973
- "the process of adding someone was boring and unrewarding." — bharatsuthar, HN, 5 Aug 2026, https://news.ycombinator.com/item?id=49179453
- "the data entry of my own prototype started to kick my ass" — Elle Morrill, a builder, 19 Jul 2018, https://ellemorrill.substack.com/p/prototyping-a-personal-crm-lessons-learned-so-far
- "Every one of them asks you to do data entry about your friends." — Vellaci maker post, Product Hunt, 2026 (shown as "5mo ago"), https://www.producthunt.com/p/vellaci/vellaci. The maker says that by week 3 they stopped logging and by week 6 they quit Notion, Dex and Monica.
- "it seems so much work, especially for people you almost talk to daily" (excerpt) — r/productivity, 23 Aug 2017, https://www.reddit.com/r/productivity/comments/6vouiq/
- "I tried Notion but takes too long to set up new people" — r/productivity, Nov 2022, https://www.reddit.com/r/productivity/comments/teexsu/_/ixjurck/. The commenter then promotes a product.
- "notion -> more overhead than i would want" — r/SaaS OP, 11 Nov 2025, https://www.reddit.com/r/SaaS/comments/1ouhrao/
- "I dislike the idea of creating a new note for every interaction" — r/ObsidianMD, Oct 2025, https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhdr5xq/
- App Store, Fabriq, 18 Nov 2020, "Long way to go": "This only supports contacts and it totally manual." — https://apps.apple.com/us/app/id1460143202?see-all=reviews
- App Store, Hippo, 18 Jun 2026: "everything besides birthday is up to you to write in notes" — https://apps.apple.com/us/app/id1458330948?see-all=reviews
- App Store, Clay (now Mesh), 22 Mar 2024, "Terrible": "go through thousands of entries and resolve those manually???" — https://apps.apple.com/us/app/id1463073824?see-all=reviews
- App Store, Mesh, 15 Jan 2026: "spent days organizing my contacts… lacks… fuzzy duplicates" — same link
- App Store, Clay, 29 Jul 2023, "Messy and confusing": "onboarding process is frustrating and too time consuming" — same link
- App Store, Dex, 14 Jun 2024: "without two way syncing it just makes a mess in my contacts" — https://apps.apple.com/us/app/id1472132715?see-all=reviews

A keyword-assisted tally (approximate) of 1–2 star reviews mentioning manual work, import, duplicates or merging: **Mesh 19 of 55, Dex 4 of 25, Fabriq 3 of 31, Covve 3 of 31, Garden 2 of 7.**

### 1.2 Execution quality: bugs, sync failures, broken sign-up, absent support — REPEATED (largest by raw count, App Store dominated)
Not on the brief's list, but this is the most frequent single complaint in store reviews. Keyword-assisted counts of 1–2 star reviews mentioning bugs, sync, login or crashes: **Mesh 28 of 55, Fabriq 23 of 31, Dex 16 of 25, Covve 17 of 31, Garden 3 of 7.** These are mostly people who wanted the product and could not get it to work.

- "I really wanted this to work" … "never able to actually use the app." — Dex, 6 Oct 2025 (link above)
- "Despite the many bugs… all the settings I spent a lot of time on… restarted." — Clay, 3 Oct 2024 (link above)
- "it doesn't even properly remember who is archived" — Mesh, 15 Jan 2026
- Fabriq, 2023–2025: at least 9 reviews say the SMS verification code never arrives, so they cannot sign up or log in. Examples: 11 Nov 2023, 13 Nov 2023, 11 Dec 2023, 21 Dec 2023, 14 Dec 2024, 15 Apr 2025.
- Covve, 25 Mar 2023: "completely scrambled my existing list of more than 8,000 contacts" — https://apps.apple.com/us/app/id958935377?see-all=reviews

### 1.3 Privacy: contact uploads, inbox access, scraping, enrichment of non-users — REPEATED (heavily HN-weighted)
**About 15 venues and about 60 voices.** Most come from 6 HN threads: Dex 2019 (12 commenters), Nat 2020 (11), Monica 2020 (7), Poppy 2026 (7), Monica 2026 (5), Nat 2022 (2). There are also about 15 store reviews, 4 Trustpilot reviews, 1 breach and 1 press article.

Two separate concerns are mixed together here:
- **(a) "Do I trust you with my data?"** This is the tech-audience concern.
- **(b) "You built a profile of *my friend* (or of me) without consent."** This is the third-party harm, and it is reported by non-users.

Quotes and evidence:
- "Trying to fetch my Gmail contacts at the first sign-up?" — atemerev, Launch HN Dex, Aug 2019, https://news.ycombinator.com/item?id=20700576
- "I really don't want to just dump all contacts into an app like this" — gexla, https://news.ycombinator.com/item?id=20703295
- "exactly the kind of stuff I don't want to store in somebody's SaaS." — thijsvandien, Show HN Nat, Oct 2020, https://news.ycombinator.com/item?id=24905982
- "I can't trust any third party to protect such personal data" — idsout, HN Monica, Dec 2020, https://news.ycombinator.com/item?id=25272848
- "no way in hell i share this data with a third party" — pousada, Show HN Poppy, Mar 2026, https://news.ycombinator.com/item?id=47259868
- "it's basically an immense liability - all my contacts and private details" — robtherobber, HN Monica, Sep 2026, https://news.ycombinator.com/item?id=49534893
- App Store, Clay, 3 Dec 2024, "Privacy lawsuit waiting to happen": a reviewer's friend found a Clay profile of herself. Link above.
- App Store, Clay, 26 May 2024: "Clay used my contact list to send invitation emails without my permission." Two further reviews (5 Nov 2024 and 25 Apr 2025) describe forced or automatic referral invites.
- App Store, Clay, 14 Mar 2023: "uses five different personal data aggregators" (review title "Read the privacy policy")
- App Store, Mesh, 31 Aug 2025: "not looking for an app to reach into my contacts or social media"
- App Store, Garden, 7 May 2018 and 10 Apr 2018: the app forces access to ALL contacts. https://apps.apple.com/us/app/id1230466454?see-all=reviews
- App Store, Fabriq, 8 Jun 2025: "they're tracking EVERYTHING" (review title includes "abandonware")
- Trustpilot, Clay (clay.earth): all 8 reviews are 1-star. Four are from **non-users** objecting to profiles built about them, for example "Copying my data from Linkedin, Flickr, other social profiles" (4 Jul 2025) and "They create profiles without authorization using AI" (5 Jun 2025). https://www.trustpilot.com/review/clay.earth
- **Covve breach.** Troy Hunt traced the "db8151dd" dataset (about 90 GB, about 22–23M records, including many non-users) to Covve, which said a legacy system was accessed. Disclosed May 2020. https://www.troyhunt.com/the-unattributable-db8151dd-data-breach/ and https://portswigger.net/daily-swig/covve-revealed-as-source-of-data-breach-impacting-23m-individuals
- The Atlantic (Kaitlyn Tiffany, Nov 2019; repost) raises consent concerns about quantifying friends' details. https://www.thelowdownblog.com/2019/11/managing-your-friendships-with-software.html?m=1
- A pattern in two independent places (Covve review 14 Jul 2023 and r/PKMS May 2023): notes in iOS or WhatsApp contacts **leak when you share a contact**. People avoid the native Contacts notes field for that reason. https://www.reddit.com/r/PKMS/comments/13cyc4v/_/jjjndha/

**AI-training concern specifically: ISOLATED on the user side.** I found no user complaint about AI training. Vendors are pre-empting it instead: Meadow says "Your data is never used to train AI" (https://textmeadow.com), and YourPond's listing says the developer does not train AI on user data. The Trustpilot "profiles… using AI" complaint is about enrichment, not training.

### 1.4 Pricing and willingness to pay — REPEATED
**About 14 venues and about 35 voices.** There are three sub-patterns:
- **(a) Subscription aversion for a personal use.** People compare the price to "remembering to call my mum".
- **(b) Paywall or credit card required before any value is shown.** These are Mesh and Dex store reviews.
- **(c) Capped free tiers.** Fabriq limits people to 150 and its inner circle to 5. Covve, Kinu (10 people) and YourPond (25) also cap free use.

Quotes:
- "I can't see ever paying $144/yr to remember to text my mom." — kstrauser, Show HN Nat.app, Mar 2022, https://news.ycombinator.com/item?id=30848910
- "I'm not paying hundreds per year to remember to call my sister." — kstrauser, Show HN Poppy, Mar 2026, https://news.ycombinator.com/item?id=47262797. This is the same person 4 years later: one voice, two dates.
- "The feature set is too shallow for a $12/mo subscription for personal usage." — m3adow, https://news.ycombinator.com/item?id=30852263
- "The hosted plan for $90 a year is way too expensive for me." — AnonC, HN Monica, Dec 2020, https://news.ycombinator.com/item?id=25273009
- "I'm okay with paying a reasonable one time fee" — marvin-hansen, Show HN Poppy, https://news.ycombinator.com/item?id=47258869
- App Store, Dex, 22 Sep 2026: "for someone who just likes to connect personally… subscription is just to high"
- App Store, Dex, 21 Jan 2025: "$12 a month for a glorified notebook?"
- App Store, Mesh, 8 Apr 2026: "Free version needs a credit card?!" Six or more further Mesh/Clay reviews (Oct 2023 to Dec 2025) object to forced trials, card-first sign-up or "dark pattern" billing. For example, 27 Oct 2023: "lying about the product being free… it's $120/year".
- App Store, Fabriq, 8 Jun 2025: the price is "absolutely ridiculous considering how specific and one-dimensional the app is". 14 Mar 2025: the paid 150-person tier stayed capped at 30.
- App Store, Amato, 4 Mar 2026: "Just another thing that wants your money" — https://apps.apple.com/us/app/id1614085893?see-all=reviews
- r/SaaS, 11 Nov 2025: "clay -> prices are on fire". Another reply: "pricing is wild on Clay for what it does". https://www.reddit.com/r/SaaS/comments/1ouhrao/
- r/ObsidianMD, 1 Apr 2026, post title: "…all the ones I found were subscription based or didn't store the data locally." https://www.reddit.com/r/ObsidianMD/comments/1s9vq31/

There is a counter-signal. Some people do pay and say so: a Mesh reviewer on 23 Sep 2024 was "excited to pay" at renewal, and a Dex reviewer on 25 Sep 2026 has used Dex for 2 years. Payers in the reviews skew toward **professional networking** use.

### 1.5 Novelty wears off, abandonment, switching to DIY — REPEATED
**About 12 venues and about 30 voices.** The main "competitor" people retreat to is **DIY**: Obsidian, Notion, Airtable, Apple Contacts notes, spreadsheets and calendars. This appears in HN Poppy (wolvoleo, opto, AdrianB1), HN Monica 2026 (andrewla, Goofy_Coyote), HN Ask 2024 (4 of 6 replies), r/ObsidianMD (25 personal-CRM posts) and r/productivity.

- "I just randomly stopped for over 2 weeks" — Elle Morrill, 2018 (link above)
- Vellaci maker, Product Hunt: stopped logging by week 3 and quit by week 6.
- "ended up retiring it" — luckyshot, HN Monica 2020, https://news.ycombinator.com/item?id=25274772
- "mostly switched to using the contacts app on my iphone for everything" — andrewla, HN Monica 2026, https://news.ycombinator.com/item?id=49523659
- "Only played around with the idea… but didn't stuck with it" — r/productivity, Mar 2022, https://www.reddit.com/r/productivity/comments/teexsu/_/i0q3u0c/
- "I stopped using it when my server died" (Monica self-host) — r/ADHD, Jul 2022, https://www.reddit.com/r/ADHD/comments/w3dzta/_/igvyj1a/
- Ask HN "Do you consider a Personal CRM to be a tarpit idea?" (27 May 2024). The OP says few people regularly keep notes about contacts, and "people don't see how managing these relationships… can benefit them". https://news.ycombinator.com/item?id=40490037
- "What personal CRMs have been made recently and died in a year or two?" — skinnymuch, Mar 2022, https://news.ycombinator.com/item?id=30869927

### 1.6 Feels creepy, transactional, or like "managing" friends (plus "built for sales") — REPEATED, but contested
**About 14 venues and about 30 voices.** Two related strands:
- Moral discomfort: profiling friends, "sociopathic", checklists.
- Category mismatch: every tool is "sales/corporate". This strand alone appears in at least 8 venues.

Quotes:
- "I would feel weird building profiles on people like that." — NoboruWataya, HN Monica, Sep 2026, https://news.ycombinator.com/item?id=49523986
- "I also don't keep dossiers on all my friends" — SoftTalker, same thread, https://news.ycombinator.com/item?id=49537935
- "To me this feels like treating human relationships as a problem to solve?" — cinntaile, Show HN Nat.app, Mar 2022, https://news.ycombinator.com/item?id=30853837
- "it makes me seem like a self-centered jerk" — ticmasta, Launch HN Dex, 2019, https://news.ycombinator.com/item?id=20700373
- "Monica is creepy as all hell" — whorleater, HN, Feb 2018, https://news.ycombinator.com/item?id=16360674
- "I kinda dont like the core concept of gamifying socialization." — samrus, Show HN Poppy, https://news.ycombinator.com/item?id=47273630
- "it always felt a little weird/artificial to use a CRM tool" — r/ADHD OP, Jul 2022, https://www.reddit.com/r/ADHD/comments/w3dzta/
- Friends "think that I'll only write them if the app tells me to" — r/productivity OP, Nov 2020, https://www.reddit.com/r/productivity/comments/k2whdd/
- "CRMs for personal use could be a store house of gossip" — same thread, https://www.reddit.com/r/productivity/comments/k2whdd/_/gdy6hi8/
- "what ARE the stages of friendship?" — r/productivity, Jan 2019, https://www.reddit.com/r/productivity/comments/agof3w/
- "satisfying and yet prescriptive…" — r/ObsidianMD, Oct 2025, https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhdr1a3/
- The Atlantic, Nov 2019: a friend objected that the friendship became "something on a Google Docs and not something that was lived."
- Shikhar Sachdev, "I Hate Personal CRMs. I Might Need One", 19 Jun 2026: friendship "shouldn't need to be optimized". He wants to stay close to about 15 people anyway. https://shikharsachdev.substack.com/p/i-hate-personal-crms-i-might-need
- "the personal CRM space is filled with sales focused tools." — inerte, HN, Aug 2026, https://news.ycombinator.com/item?id=49182021
- App Store, Mesh, 31 Aug 2025: "Not for me, don't need CRM app in my personal accounts". App Store, Fabriq, 22 Jul 2020 (praise): "about family and friendship rather than freaking networking."

**Contested.** In the r/ObsidianMD thread, the "relationship checklists sound sociopathic" comment scored −44. Rebuttals framing tools as **accommodation** for ADHD or autism scored +51, +42, +40 and +34 (https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/). The stigma is real as a *feeling*, but users defend the *need*. Framing matters more than function.

### 1.7 Product dormancy, discontinuity and lost trust — REPEATED
**About 8 venues and about 25 voices.**
- HN "We are rebuilding Monica" (Aug–Sep 2026) has 8 commenters on continuity. For example, "why aren't mentioning their failed rewrite from 3 years ago?" (https://news.ycombinator.com/item?id=49523735) and "They lost me when they threw everything out and moved to Chandler." (https://news.ycombinator.com/item?id=49523250)
- "I've been burned too many times by startups with proprietary clouds." — dreamcompiler, Show HN Nat 2020, https://news.ycombinator.com/item?id=24904280
- Fabriq store reviews:
  - "Does this company still exist?" (9 Aug 2023)
  - "App No Longer Maintained?" (14 Mar 2024)
  - "no major updates in two years" (26 Aug 2024)
  - "No updates in 10 months" (3 Oct 2024)
  - "abandonware" (8 Jun 2025)
  - "Please come back. Fix this app." (29 Oct 2025)
- Garden store reviews: 16 Apr 2024, unable to log in, server issues. 9 Apr 2024: "data is only stored on the server and not cached".
- Dex store review, 5 Nov 2025: "Two emails and no response… This app is dead."
- Ask HN tarpit thread, May 2024: users need "confidence it will last". https://news.ycombinator.com/item?id=40489700

### 1.8 Hard to capture memories naturally in the moment — REPEATED, mostly voiced as a missing feature
**About 12 venues and about 15 voices.** People rarely say "capture is hard" in those words. They say "I forget to log it", "I have to open a computer", or "let me add a note when I mark 'we connected'".

- "I just feel lazy on inputing" / "I will forget it to do one day" (excerpts) — r/productivity, Aug 2017, https://www.reddit.com/r/productivity/comments/6vouiq/
- "when I remember to add these people…but no notifications set" — r/ADHD, Aug 2024, https://www.reddit.com/r/ADHD/comments/1f2h5as/_/lk789rd/
- "Logging in to keep notes was a pain" — jvanderbot, HN Monica 2026, https://news.ycombinator.com/item?id=49524615
- "Why make a mobile app if you have to use a computer along with the app?!" — Dex App Store, 7 Jun 2024
- Fabriq App Store, 1 Nov 2019, wants "an easy way to add notes when you click 'we connected'". Garden, 8 Sep 2019, wants "the ability to log notes with each interaction". CatchUp App Store, 19 Nov 2025 and 19 Apr 2026, wants notes attached. https://apps.apple.com/us/app/id1358023550?see-all=reviews
- "just quickly talk in notes and everything magically works" — r/PKMS, about 2025, https://www.reddit.com/r/PKMS/comments/13cyc4v/_/ncrscfa/. The commenter is building a product.
- Positive counter-example: "The voice feature makes it so easy to quickly log someone's name while I'm walking out of class" — YourPond App Store, 27 Sep 2026, https://apps.apple.com/us/app/id6761669539?see-all=reviews

### 1.9 ADHD and executive function — REPEATED (demand side)
**About 12 venues.** r/ADHD has a dense cluster of "keep in touch" threads (33 posts, one with 167 comments: https://www.reddit.com/r/ADHD/comments/fqtzdo/). There are also 3 commenters in HN Poppy, 2 in r/ObsidianMD, and App Store Fabriq (6 Nov 2025) and Amato (29 Jan 2024).

- "I subjectively feel like a couple of days have passed… it's been six months" — r/ObsidianMD, Oct 2025, https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhe6ms6/. The commenter calls it time blindness.
- "Having ADHD, I very much suffer from 'out of sight out of mind'" — r/ADHD, Aug 2024, https://www.reddit.com/r/ADHD/comments/1f2h5as/
- "As someone with ADHD I really need a solid way to organize myself" — Fabriq App Store, 6 Nov 2025
- "I have inattentive ADHD and creating systems… is crucial for me." — Amato App Store, 29 Jan 2024
- Nuance from r/ADHD (Jul 2026, score 208): "I didn't forget. It's called executive dysfunction." https://www.reddit.com/r/ADHD/comments/1ur1eyj/. A reminder does not solve *starting* the contact.
- Low-tech workarounds that were praised: fridge photos of friends (https://www.reddit.com/r/ADHD/comments/1u954io/_/ose39nw/) and naming plants after friends (https://www.reddit.com/r/ADHD/comments/i7t51f/). Both suggest that **ambient presence** works better than notifications for this group.
- "this app is a good way to remember… when I remember to check it" (excerpt), with a request for a widget — Fabriq App Store, 28 Oct 2026

### 1.10 Reminders becoming obligation, guilt, nagging or noise — MODERATE (smaller than expected, and outweighed by praise)
**About 8 venues and about 11 voices.**
- "Then forget to call and feel bad about forgetting." — wh-uws, HN Monica 2020, https://news.ycombinator.com/item?id=25274588
- "reminders start feeling like noise" — swaminarayan, Show HN Poppy, https://news.ycombinator.com/item?id=47258484
- "I stubbornly don't want a CRM to remind me of keeping in touch." — simonebrunozzi, Launch HN Dex, https://news.ycombinator.com/item?id=20700661
- The Atlantic, Nov 2019: a spreadsheet user felt like "kind of being a bad friend" when a cell turned orange.
- "your psyche will start to perceive any communication in terms of a checkmark" (excerpt) — r/ObsidianMD, Oct 2025, https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhcalij/
- "I was inundated with birthdays and reminders of people" (excerpt) — Clay App Store, 29 Jul 2023
- "Notifications random and annoying." — Mesh App Store, 31 Aug 2025
- "I feel like I get psychic damage from the random thoughts of guilt" — r/ADHD, Feb 2025, https://www.reddit.com/r/ADHD/comments/1iphi5i/_/mcrxhna/. This is guilt about lapsed contact in general, not app-caused.
- "losing touch with some people is a feature not a bug!" — testfoobar, HN Nat.app 2022, https://news.ycombinator.com/item?id=30849728

**Important counterweight.** Reminders are the **single most praised feature** in store reviews. More than 20 of Fabriq's 4–5 star reviews mention reminders or nudges, about 8 of Garden's do, and Covve, CatchUp and Dear reviews do too. Four HN Monica 2026 commenters praise reminders. The complaint is about *volume and framing* ("overdue", "noise", "inundated"), not about reminders as such. "Gentle" is the recurring praise word: Fabriq 2019 (×4) and Garden 2 Aug 2019.

### 1.11 Poor search or recall — ISOLATED to MODERATE (thin evidence)
**About 6 voices, nearly all in store reviews.** Complaints are about **basic search and lost notes**, not about "smart recall".
- "I often have more success finding contacts by manual search or through Mac Contacts. The Nexus AI is like really really bad." — Clay App Store, 25 Apr 2025
- "none of my notes for my contacts are there! Even the Nexus feature… isn't working" — Mesh App Store, 22 Jan 2026
- "there is no ability to search contacts" — CatchUp App Store, 3 Feb 2025
- "with 5,000 contacts I need search" — Garden App Store, 18 Apr 2018
- Positive example of recall value: "searched for 'sauna guy', and he po[pped up]" — r/ObsidianMD, https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/o7bm6b0/

### 1.12 Other recurring situations

**Long-distance friends, moving or graduating — REPEATED as the use case people praise (about 8 reviews).**
- CatchUp 19 Nov 2025: "reminders to connect with long-distance friends"
- Fabriq 16 Aug 2026: "people move away"
- Fabriq 7 Nov 2019: "those of us who move cities"
- Fabriq 22 Apr 2023: friends "around the world"
- YourPond 7 May 2026: friends "spread across the country"
- Garden 6 Jul 2019: high-school friends
- CatchUp 6 May 2018: after graduating

**Leaving social media and losing Facebook's birthday prompts — MODERATE (about 7).**
- Fabriq 22 Sep 2022, 7 Oct 2019, 11 Oct 2019 and 22 Mar 2021
- Garden's 2018 positioning was "without Facebook" (https://news.ycombinator.com/item?id=16803465)
- r/productivity: "I do miss its birthday reminder feature" (https://www.reddit.com/r/productivity/comments/k2whdd/_/gdy6hi8/)
- r/ObsidianMD: "since quitting Facebook, that became even a bigger issue" (https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhcc14r/)

**New parents and kids' names — MODERATE (about 5).**
- YourPond 1 Oct 2026: "As a recent new mom… note of both the parent and child's name"
- Fabriq 24 Jan 2020: "As a new mom and an isolated extrovert", objecting to the cap of 5 people in the inner circle
- r/ObsidianMD: "helped me remember parent names at my kids school" (https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhi0l88/)
- Show HN "LinxMemo – Local-first personal CRM for parents", Jan 2026 (https://news.ycombinator.com/item?id=46665563)

**Grief, ageing and memory loss — ISOLATED to light (about 5).**
- r/ADHD Jun 2026: the OP's father died, prompting the wish to keep in touch better (https://www.reddit.com/r/ADHD/comments/1u954io/)
- r/ObsidianMD: a scenario about a friend whose memory worsened (https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhcqq9q/)
- HN Nat.app: "Alzheimer's runs in my family" (https://news.ycombinator.com/item?id=30855215)
- Dear App Store, 27 May 2026: "family who may not be around forever" (https://apps.apple.com/us/app/id6760280035?see-all=reviews)

**Reciprocity and the recipient side — ISOLATED.**
- "I get annoyed when I'm being contacted consistently by people I worked with 5 years ago." — r/productivity, Nov 2020, https://www.reddit.com/r/productivity/comments/k2whdd/_/gdxmacq/
- "Why is it only on the person with ADHD?" — r/ADHD, Jul 2026, https://www.reddit.com/r/ADHD/comments/1ur1eyj/_/oweh3tx/
- "most of the people i invested in did not reciprocate" (excerpt) — r/ObsidianMD, https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nho6zx0/

**Platform gaps — MODERATE (hygiene).**
- iOS-only complaints: Poppy (×2 on HN)
- No iPad app: Mesh (×3)
- Desktop required: Dex and Monica
- Chrome-only extension: Dex HN (×2)

**AI-specific trust — MODERATE, and new.**
- Show HN Poppy (Mar 2026): **10 commenters** criticised AI-written marketing copy and 3 flagged apparently fake testimonial avatars. For example, "The avatars in the 'testimonials' are all fakes" (https://news.ycombinator.com/item?id=47260386) and "AI writing = nobody will read it." (https://news.ycombinator.com/item?id=47258480)
- An anonymous 2026 comparison blog says AI talking points (asking about a friend's vacation) "felt creepy" (https://softwaremany.pages.dev/blog/2026-02-14-personal-crm-tools-comparison/). This is a low-credibility source: anonymous, publisher unclear.

---

## 2. What users say they want or praise

Ranked by how often it appears.

1. **A gentle nudge to reach out, at a cadence they choose (very strong).** More than 20 Fabriq, about 8 Garden and several Covve, CatchUp and Dear 4–5 star reviews say this, as do 4 HN Monica 2026 commenters.
   - "gently nudges me to reach out to the people I want to prioritize" — Fabriq, 30 Aug 2019
   - People want flexible cadences: every two weeks and twice a year (CatchUp, 25 Dec 2025); "daily, biweekly, etc." (Dear, 10 Jun 2026); "One month seems too short" (https://news.ycombinator.com/item?id=47278390); counting in days, "7, 14, 30, 90, 180, or 365" (r/ObsidianMD).
2. **Birthdays and important dates, without setup (strong).**
   - "This app reminded me of a birthday I would have forgotten today." — YourPond, 26 Oct 2026
   - "I will never forget to call my grandmother on her birthday ever again" — Fabriq, 17 Sep 2019
   - Fabriq, 8 Dec 2019, asks for birthday and anniversary reminders.
   - The gap Facebook left (see §1.12).
3. **Simple, with no upsell (strong).**
   - "No up sells, no scams. Thank you!" — Garden, 27 Jul 2022
   - "Simple, simple, simple" — Fabriq, 26 Sep 2019
   - "All too complicated to be fast or too simple to be usable at any scale" — Dex, 25 Sep 2026, praising Dex as the middle ground
   - Garden 24 Jan 2020: other CRM apps were "wayyyy too complicated".
4. **A quick note on what we talked about, attached to the check-in (strong, as a missing feature).** Fabriq 1 Nov 2019; Garden 8 Sep 2019 and 20 Mar 2019; CatchUp ×3 (2025–26); Fabriq 2 Jun 2024 wants to log past dates.
5. **Automatic logging from the channels people actually use: WhatsApp, iMessage, email (strong, mainly professional users).** Seen in HN Dex 2019 (kilroy123, jeeshan), HN Nat 2020 (c1sc0), Dex 30 Jan 2025 (praises auto-tracking WhatsApp), Dex 29 Jun 2025 (WhatsApp integration "on maintenance too long"), Fabriq 18 Nov 2020 and r/SaaS Nov 2025 ("reads my LinkedIn email etc").
6. **Help knowing what to say (moderate).**
   - "prompts for those time you're not sure what to say" (excerpt) — Fabriq, 22 Jul 2020
   - "Favorite feature: conversation starters" — Fabriq, 23 Jan 2023
   - "The new AI conversation builder reduces the barrier for me to reach out" — Covve, 24 Feb 2023
   - An r/productivity post titled "Personal CRM that actually helps you know what to say?" (1 Feb 2026, removed by automod: https://www.reddit.com/r/productivity/comments/1qtoe28/)
   - Counter: generated talking points can feel creepy (§1.12).
7. **Remembering commitments ("next time I'll bring X", "I promised an intro") — moderate but distinctive.**
   - "the 'next time we'll meet I'll bring X' sort of commitments? Those still [slip]" — r/ObsidianMD, https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhdy2za/
   - A founder there reports from customer interviews that tracking commitments was the gap.
   - r/SaaS Nov 2025: "you promised X an intro to Y".
8. **Local, private or one-time purchase (strong on HN, moderate elsewhere).** Seen in HN Poppy, HN Nat 2020 (end-to-end encryption request), r/ObsidianMD 2026 and Show HN Radius (local-first, Nov 2025).
9. **Ambient visibility over notifications (moderate).** Fabriq widget requests and complaints that the widget is broken (2023-08 "messages widget is the best part", 2024-03, 2024-10, 2026-10), fridge photos, plants named after friends, and "I just want to know which activity is the most overdue" (r/ObsidianMD, https://www.reddit.com/r/ObsidianMD/comments/1nw01hn/_/nhe3py1/).
10. **Voice capture (thin from users, strong vendor convergence).** Users: the YourPond review (27 Sep 2026) and the r/PKMS "just quickly talk" comment. Vendors moving the same way: Dex improved voice dictation (App Store notes, Jul 2026) and added "Talk to Dex" (Oct 2026), Echo launched "first personal CRM with voice mode" (Show HN, Nov 2025), and a listing for an app named Dunbar advertises voice transcription. **I found no user complaining that voice is missing.** Treat this as a hypothesis, not demand evidence.
11. **Remembering kids' and partners' names (moderate).** YourPond 1 Oct 2026, r/ObsidianMD, r/SaaS ("forgotten someone's kid's name").
12. **A "who have I lost touch with" view (light).** "I'm looking for an easy way to see who I haven't contacted" — https://news.ycombinator.com/item?id=30850408

---

## 3. Commercial struggles: shutdowns, pivots, dormancy, pricing

Each entry says whether the reason was **stated by the company** or **inferred**, and how strong the evidence is.

| Product | What happened | Date | Evidence | Stated reason (by whom) | Quality |
|---|---|---|---|---|---|
| **Clay → Mesh** | Acquired by Automattic; founders joined Automattic's "Other Bets". Renamed Mesh. | Acquired 12 Jun 2025; renamed 26 Mar 2026 | https://automattic.com/2025/06/12/automattic-welcomes-clay ; https://me.sh/stories/mesh ; https://alternativeto.net/news/2025/7/clay-acquired-by-automattic-platform-and-team-to-remain-active | Acquisition: an "identity layer" fitting Beeper and Gravatar (Automattic, per TechCrunch coverage). Rename: crowded namespace and confusion with Clay.com (Mesh team). Neither cites commercial struggle. | Strong for the facts. **No evidence of a cause tied to struggle.** Reported funding was about $8–9M. |
| **Mesh pricing** | Now $19.99/month or $119.99/year (App Store, Nov 2026). A 2023 review cited $120/year. | 2023–2026 | App Store listing; reviews | — | No *sharp* change evidenced. The recurring complaint is credit-card-first and forced-trial onboarding (at least 7 reviews, 2023–2026). |
| **UpHabit** | Personal CRM apps shut down after a 2022 shift to "Relationship Selling" and "Salesforce Hygiene". | Shutdown Apr 2026 | Dex's list, updated Jul 2026 (**competitor-authored**): https://getdex.com/blog/personal-crm-list/ . uphabit.com returned HTTP 503 on 1 Nov 2026. The app did not appear in US App Store search. | None found from UpHabit. | **Medium-weak.** Competitor source plus circumstantial signs. |
| **Garden** (Meaning Labs) | Dormant. Last App Store update 4 Jun 2020. Users reported log-in and server failures in Apr 2024. | 2020– | iTunes Search API (`currentVersionReleaseDate` 2020-06-04); App Store reviews 9 and 16 Apr 2024; Dex list says it "hasn't been updated since mid-2020" | None found. | Strong for dormancy; cause unknown. |
| **Fabriq** | Publisher changed from Social Fabriq, Inc. to Sowlutions Inc. Update gap from 13 Nov 2023 to an undated "Mar 26" release. 2023–2025 reviews report abandonment and broken log-in. Recent updates (2025–Oct 2026) say only "Bug fixes". Price $4.99/month or $39.99/year. | 2023–2026 | https://apps.apple.com/us/app/id1460143202 (seller and copyright lines, version history); reviews in §1.7 | No announcement of the ownership transfer found. | Medium. Ownership change is evidenced by store metadata; there is no explanation. |
| **Monica** | Side project of two founders. Rewrite ("Chandler") started 2022, beta Jun 2023. In Aug 2026 announced another from-scratch rebuild (the new version is called "v3"). | 2022, 2023, 2026 | https://monicahq.com/en/blog/a-new-version-is-coming/ (28 Aug 2022: "Monica is still a side project for us"; "we don't work full time on this, at all"); https://monicahq.com/en/blog/chandler-is-in-beta/ (8 Jun 2023: "basically two friends"; 25M+ Docker pulls); https://www.monicahq.com/en/blog/we-are-rebuilding-monica/ (30 Aug 2026: current version "no longer the personal CRM I would build today") | **Founder-stated:** old codebase, earlier design decisions, part-time team. **Commentator-inferred (HN Aug 2026):** failed or repeated rewrites, lost trust (8 voices). | Strong. |
| **Contactually** (adjacent, professional) | Acquired by Compass (about 37,000 customers). Standalone product discontinued. | Feb 2019; Mar 2022 | https://inman.com/2019/09/03/clients-allege-compass-is-no-longer-supporting-contactually ; https://en.wikipedia.org/wiki/Compass,_Inc. | Absorbed into Compass's own CRM (reported). | Medium. |
| **FollowUp** | Acquired in 2018; pivoted to an email-reminder tool. | 2018 | Dex list (competitor) | None. | Weak. |
| **Nouri** | Pivoted to event management and ticketing. | n.d. | Dex list (competitor) | None. | Weak. |
| **Monaru** (YC S19) | Listed as "Dead"; raised $150K. | n.d. | https://www.cbinsights.com/company/monaru | None. | Weak (one database label). |
| **Ryze** | No longer available in the US App Store by Jun 2019, per a user. | 2019 | https://www.reddit.com/r/productivity/comments/agof3w/_/erfyyna/ ; Dex list dates it 2017–2019 | None. | Weak. |
| **Etacts / ConnectedHQ** (early era) | Acquired by Salesforce and LinkedIn respectively; Etacts then shut down. | ~2011 | Dex list; "Email Contact Manager Etacts Shuts Down" (TechCrunch headline, via search) | Acqui-hire (inferred). | Medium. |
| **Covve** | Not a shutdown. A May 2020 data breach traced to Covve. | 2020 | Troy Hunt / PortSwigger (§1.3) | Covve: a "legacy system" was accessed before decommissioning. | Strong. A trust event. |
| **Dex** | Still active and shipping often. App Store prices: Premium $19.99/month or $143.99/year ($12/month billed annually); Professional $39.99/month. A Jan 2025 review cited $12/month. | 2025–2026 | https://apps.apple.com/us/app/id1472132715 | — | No confirmed sharp change. The $12 vs $19.99 gap may be annual vs monthly billing. Support complaints: "This app is dead", 5 Nov 2025. |
| **Nat.app** | Appears repositioned as "personal CRM for consultants and freelancers". | n.d. | Search summary of nat.app; not verified | — | Weak. |

### Category-level commercial signals (my inference, labelled as such)

- **Small scale even for the leaders.** US App Store rating counts on 1 Nov 2026: Mesh 765, Covve Personal CRM 626, Dex 266, Fabriq 165, Garden 50, CatchUp 47, YourPond 31, Hippo 8, Poppy 4, Kinu 1, Dunbar148 0 (iTunes Search API). Rating counts are not user counts, but these are small next to mainstream consumer apps.
  - Dex's founder claims a "100k" figure on Reddit; the comment is truncated and the unit is unclear (https://www.reddit.com/r/SaaS/comments/1ouhrao/_/npan3ra/). Unverified.
- **Flood of near-identical entrants.** A rough App Store scan of apps whose names match keep-in-touch, friend, relationship, CRM or remember terms found 630 apps. **398 were first released in 2025–2026 (307 in 2026 alone), and 470 have fewer than 10 ratings.** The name filter is noisy (it includes friend-finding apps), so treat the numbers as directional.
  - Reddit corroborates the flood: most replies to "is there a personal CRM…" threads in 2025–26 are founders pitching their own app (r/SaaS 1ouhrao, r/PKMS 13cyc4v, r/productivity teexsu).
  - The Ask HN "tarpit" question (May 2024) is the founder-side view of the same pattern.
- **Drift toward professional or paid networking.** Dex's founder told Axios in Aug 2019 that Dex was for loose ties, not family and close friends (https://www.axios.com/2019/08/27/startups-new-frontier-optimizing-your-friendships). UpHabit moved to sales (competitor source), Contactually was absorbed into a real-estate CRM, Mesh has a Teams offering, Covve's other apps centre on business cards, and Nat.app now appears aimed at freelancers. One user's view (Clay App Store, 12 May 2025): "a product team incorrectly thinking they could eat up the lower end of the business market". **Inference, not founder-stated:** the paying segment is professional networking, and products built for friends or family either stay small and tip- or low-priced (CatchUp is tip-funded per a 5 Aug 2026 review) or go dormant (Garden, Fabriq's maintenance gaps).
- **I found no founder post-mortem that explicitly blames the business model for a friendship-app shutdown.** The closest founder-side statements are Elle Morrill (data entry killed her own use of her prototype), the Vellaci maker (data entry), the Ask HN tarpit OP (few people keep notes), and Monica's founders (side project, constrained codebase).
  - A search-snippet summary of an Indie Hackers "SaaS graveyard" post ("Nobody actually does the data entry after Day 3") could not be retrieved or verified. Excluded from counts.

---

## 4. Summary tally

| Rank | Problem | Venues (approx.) | Voices (approx.) | Label |
|---|---|---|---|---|
| 1 | Manual maintenance, data entry, import/dedupe cleanup | ~20 | ~40 | REPEATED |
| 2 | Bugs, sync, sign-up failures, no support | ~6 store listings plus HN | ~90 low-star store reviews | REPEATED (store-dominated) |
| 3 | Privacy (self and friends' data, scraping, breach) | ~15 | ~60 (HN-heavy) | REPEATED |
| 4 | Pricing, subscription aversion, card-first paywalls | ~14 | ~35 | REPEATED |
| 5 | Abandonment, novelty fades, retreat to DIY | ~12 | ~30 | REPEATED |
| 6 | Creepy, transactional, "built for sales" | ~14 | ~30 | REPEATED, contested |
| 7 | Dormancy and continuity distrust | ~8 | ~25 | REPEATED |
| 8 | Capture in the moment | ~12 | ~15 | REPEATED (as a missing feature) |
| 9 | ADHD and executive function need | ~12 | ~15 | REPEATED (demand side) |
| 10 | Reminder guilt, nagging, noise | ~8 | ~11 | MODERATE; outweighed by reminder praise |
| 11 | Long distance, leaving social media | ~10 | ~15 | REPEATED (use case) |
| 12 | New parents | ~4 | ~5 | MODERATE |
| 13 | Search and recall | ~5 | ~6 | ISOLATED to MODERATE |
| 14 | Grief, ageing, memory loss | ~5 | ~5 | ISOLATED to light |
| 15 | AI-training privacy (user-voiced) | 0 user voices | — | Not observed. Vendors pre-empt it. |
