# 03 · Acquiring context without manual reconstruction: sources assessed

*Research only, 18 Oct 2026. Platform facts were verified against primary documentation on that date; each carries its URL. Classes: **(a)** primary documentation · **(b)** vendor site or listing · **(c)** third-party reporting · **(d)** inference. Nothing was connected, imported or built. Where a claim could not be verified it is marked.*

## 1. The evaluation frame

For every source, the brief asks what is accessible, what consent it needs, how provenance is preserved, what it costs the user and the system, how often it is actionable, how fast it goes stale, the identity and duplication risk, whether it adds a sensitive processor, and what would justify a spike. The two Kinship rules that decide most cases before any API is read:

- **Every durable statement has a source, and the user chose it** (contract §2, §7). A source that cannot name a person reliably, or that the user did not pick item by item, cannot produce a memory. It can at most produce a *prompt*.
- **Only the people the user picks are saved; the address book never leaves the phone; the minimal roster goes to the model** (T8, CC-3). Any source that reads about people the user did not pick is out.

A third, from the evidence in `00` §4.5: **a friend's data read without the friend** (their posts, their messages, their photo) is the creepiness the research warns about, and it is a consent problem Kinship cannot solve on the friend's behalf.

### The summary table

| Source | Accessible without new entitlement | Consent | Provenance | User effort | System cost | Actionable | Staleness | Identity / dup risk | New sensitive processor | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| iOS Contacts (as built: name, id, birthday) | yes | per-pick | "From Contacts" | zero | built | birthday Moments | low | low | no | **Keep** |
| Contacts: related names, anniversaries | yes | same pick | "From Contacts" | zero | small | low–medium | low | medium (a name, not a person) | no | **Explore later, narrowly** |
| Contacts: Notes field | **no** (Apple approval) | — | — | — | — | — | — | — | — | **Reject** |
| Keyboard dictation | yes | none (system) | the note | low | **zero** | as a Tell | n/a | names mis-heard | no (on device) | **Use now (copy)** |
| On-device speech in Tell (SFSpeechRecognizer, on-device) | yes (permission) | speech + mic | the transcript, shown | low | small–medium | as a Tell | n/a | names | no, if on-device enforced | **Later (CC-25 step 2)** |
| SpeechAnalyzer (iOS 26) | yes, device-dependent | same | same | low | medium; RN bindings immature | as a Tell | n/a | names | no | **Watch** |
| Share extension (text, URL) | yes (App Group, EAS config) | per share | "You shared · link" | low, in the moment | medium | medium–high | low | the user names the person | no | **The best external path; later (CC-25 step 3)** |
| Calendar (full access) | yes (permission) | full access, cannot be per-event | event title and attendees | one permission | medium | medium, with a correctness caveat | fast | medium (attendee ≠ participant) | no | **Out of onboarding (T7/D6); Explore later as evidence** |
| Journaling Suggestions | capability in Xcode (self-service per docs) | system sheet + per pick | "From a moment you picked" | low | medium–high (SwiftUI picker, no RN binding) | low as facts; medium as a prompt | n/a | name only | no | **Reject for now** |
| Photos (one picked photo + a sentence) | yes (PHPicker, no permission) | per pick | the note + a photo | low | medium (storage, image handling) | medium | n/a | the user names | no | **Plausible later, narrow** |
| Photo library scanning, face names | names not accessible | — | — | — | — | — | — | — | — | **Reject** |
| Instagram / LinkedIn / Facebook APIs | no friends data | — | — | — | — | — | — | — | yes | **Reject** |
| Social data exports (ZIP) | yes, desktop | — | weak | high | high | low | medium | high | yes | **Reject** |
| iMessage history | **no API** | — | — | — | — | — | — | — | — | **Reject** |
| A message excerpt the user pastes or shares | yes | per share | "You shared" | low | as share ext. | medium | n/a | the other party's words | no | **Only as explicit share, later; with rules** |
| Google Contacts (People API) | yes (sensitive scope, verification) | OAuth | "From Google Contacts" | one sign-in | medium (verification, a server-side token) | same as Contacts | low | duplicates with iOS Contacts | yes (a new processor) | **Reject for V1** |

---

## 2. Apple platform sources

### 2.1 Speech

**Keyboard dictation (the mic key).** (a) Apple's user guide: dictation "requests are processed on your device in many languages—no internet connection is required", with exceptions for search boxes; availability varies by language and region ([support.apple.com/guide/iphone/dictate-text-iph2c0651d2/ios](https://support.apple.com/guide/iphone/dictate-text-iph2c0651d2/ios)). (d) For a React Native `TextInput` it costs nothing: no code, no permission prompt, no usage string, the app never sees audio; the user sees the words and edits before Keep. Limits: no programmatic start, no interim events, no custom vocabulary (so names are at the mercy of the system model), and the user must find the key. (c) Offline dictation needs the keyboard language installed and the dictation language downloaded.

**Verdict:** use it now, by one line of copy on the first Tell and the dock ("Type it, or use the mic on your keyboard."), never calling it "voice" (contract §9). It is the only speech path with zero trust cost, and measuring whether people use it is impossible from the app (dictated text is text), so it is measured in the usability study.

**SFSpeechRecognizer (iOS 10+), the on-device path.** (a) `supportsOnDeviceRecognition` and `requiresOnDeviceRecognition` ("Set this property to true to prevent an SFSpeechRecognitionRequest from sending audio over the network. However, on-device requests won't be as accurate."); the server path sends audio to Apple and has a one-minute limit and per-device quotas; `NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription` are mandatory; Apple: "Do not perform speech recognition on private or sensitive information." ([developer.apple.com/documentation/speech/sfspeechrecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer); [asking-permission-to-use-speech-recognition](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition)). (a) `expo-speech-recognition` wraps it, exposes `requiresOnDeviceRecognition` and `supportsOnDeviceRecognition()`, needs a development build ([github.com/jamsch/expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition)); `@react-native-voice/voice` is archived (Jan 2026). D5 already requires on-device only and "never silently fall back to uploading raw audio"; T3 restricts the copy "on this phone" to when `requiresOnDeviceRecognition` is on.

**SpeechAnalyzer / SpeechTranscriber (iOS 26).** (a) Entirely on device, models fetched to system storage, built for long-form audio, no one-minute limit; availability is runtime-checked (`isAvailable`), Apple publishes no device list; `DictationTranscriber` uses the same models as system dictation ([developer.apple.com/documentation/speech/speechtranscriber](https://developer.apple.com/documentation/speech/speechtranscriber); WWDC25 session 277). (c) RN bindings are experimental (Callstack, Aug 2025). **Not verified:** whether it needs Apple Intelligence (no Apple statement; community reports put the floor around iPhone 12).

**Verdict for a dock mic:** the right second step, as CC-25 already orders it, using SFSpeechRecognizer on-device via `expo-speech-recognition` with the live transcript in the field (so names are corrected before Keep), falling back to "not available on this phone" rather than to the server. SpeechAnalyzer is the better engine once RN bindings mature and the device floor is known. **What would justify the spike:** Stage 2 showing that participants who dictate produce more lines per minute with no more corrections than typists, and that the keyboard mic is hard to find.

### 2.2 Contacts

(a) The built picker saves name, contact id and birthday; `expo-contacts` also exposes `dates` (anniversaries), `contactRelations` (related names, e.g. spouse), `socialProfiles`, `image`, and the `note` field, which **requires the `com.apple.developer.contacts.notes` entitlement and Apple's permission before App Store submission** ([developer.apple.com/.../com.apple.developer.contacts.notes](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.contacts.notes); [docs.expo.dev/versions/latest/sdk/contacts](https://docs.expo.dev/versions/latest/sdk/contacts/)). (a) iOS 18 limited access: `presentAccessPicker()` and `ContactAccessButton` let the user grant specific contacts; K25's Choose-from-Contacts already uses the system picker with no permission.

- **Related names:** user-entered, rare, and a name rather than a person ("Spouse: Pedro"). The pipeline already treats a related someone as a `related_people` row only when the user's own words say so; a Contacts relation would be a second source for the same thing with weaker provenance. **Explore later, narrowly:** at most as a suggestion when "Who is Pedro?" is asked and Susan's contact lists a Pedro, offered, never applied.
- **Anniversaries:** a dated line "From Contacts", like a birthday, when the contact has one. Cheap and sourced. Could ride with the birthday rule; it is a Today-eligibility question for the founder, not a capture one.
- **Notes field:** reject. Apple approval, and the field is where people keep exactly the sensitive things (gate codes, medical notes) Kinship must not read in bulk.
- **Favourites, call history:** not available to apps (already recorded in `approved-design-coverage.md`).

**Verdict:** keep Contacts as built. Birthdays are the one source with zero effort, perfect provenance and a Moment at the end.

### 2.3 Share extension

(a) `expo-share-intent` receives text, URLs, images, video and files through an App Group, opens the main app to process the share (Expo notes that processing inside the share view controller is not officially supported); one extension target on EAS; `expo-share-extension` offers a separate RN root with its own limits (no `TextInput` without workarounds, exclude `expo-updates` and dev-client) ([github.com/achorein/expo-share-intent](https://github.com/achorein/expo-share-intent); [github.com/MaxAst/expo-share-extension](https://github.com/MaxAst/expo-share-extension)). (a) Share extensions are limited to 120 MB ([reactnative.dev/docs/app-extensions](https://reactnative.dev/docs/app-extensions)). (a/d) **A Messages conversation cannot be shared to a third-party extension**: Apple documents forwarding selected bubbles to new recipients, not the share sheet; copy and paste is the realistic route. (a/d) The Calendar app does not hand an event to third-party extensions; an `.ics` file from Mail or Files can be.

**What it gives:** an article, an event page, an invitation link, a photo, a selected paragraph of text, shared *by the user, in the moment it is relevant*, into a Tell that already knows how to name a person and ask when it cannot. Provenance is natural ("You shared · a link · Oct 18"). Effort is the lowest of any external source because the user is already looking at the thing.

**Risks:** the extension must not do network work or run the understanding path; it writes to the App Group and the main app Tells. A URL's page content must not be fetched and fed to the model wholesale (it is not the user's words; grounding breaks). The safe shape is: the shared text or the link's title as the note, the link kept as an attachment on the source, and the user's own sentence ("Susan sent me this, it's the venue she's looking at") as the words that become memory.

**Verdict:** the best external path, and already in the roadmap as CC-25's third capture step (a *text* share extension). Nothing new to authorise. **What would justify pulling it earlier:** the plan's own beta rule ("Change the input: pull the post-encounter/calendar prompt and share sheet forward" if captures fall below one per user per week, `KINSHIP_2_OPERATIONALIZATION.md` §30) and Stage 3 showing that dogfood users keep wanting to tell Kinship about something they are looking at elsewhere.

### 2.4 Journaling Suggestions (iOS 17.2+)

(a) A system picker, presented in a system process, that returns one chosen suggestion: Contact (**name and photo only**), EventPoster, Photo, LivePhoto, Video, Location, LocationGroup, MotionActivity, Workout, Podcast, Song, Reflection, StateOfMind. The app receives only the details of the chosen item. First use shows a once-per-device Apple consent sheet; the user controls categories in Settings. Suggestions are created on the device (Apple Newsroom, App Store listing, Apple Support). The entitlement `com.apple.developer.journal.allow` is added "by enabling the Journaling Suggestions capability in Xcode"; **no application or approval step is documented** (a correction to the brief's premise; re-check in the developer account's capability list before planning). iPad support arrived with iPadOS 26; Mac Catalyst ignores the picker. **No React Native or Expo binding exists**; the picker is SwiftUI, so a custom Expo module would be needed ([developer.apple.com/documentation/journalingsuggestions](https://developer.apple.com/documentation/journalingsuggestions); [the entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.journal.allow); [Tech Talk 111384](https://developer.apple.com/videos/play/tech-talks/111384)).

**What it could do for Kinship:** a cue. "Saturday: a walk with Maya, 12 photos" is a prompt to write; it is not a memory. The Contact item's name must still be matched to a person in People (the same name rule and "Which Maya?" question as a note). The content ("what happened") is still the user's sentence.

**What it cannot do:** supply a sourced fact, reduce typing for the thing that matters, or work in the simulator (community reports). It also carries Apple's sensitive-data terms (DPLA) for suggestion data.

**Verdict:** reject for now. It is a plausible later cue source for "Anything worth remembering?" after a planned encounter (T6, "later"), competing with calendar evidence for the same job, with a smaller surface (no attendee lists, no titles) and a nicer consent story (per item). **What would justify a spike:** the post-B9 decision on planned-encounter prompts choosing a cue source; then a one-week Expo-module prototype on a device to see what the Contact and Photo suggestions actually contain for a real week.

### 2.5 Calendar

(a) iOS 17 split: write-only access can create and save events; reading needs full access with `NSCalendarsFullAccessUsageDescription`; `EKEventEditViewController` needs no permission because it renders out of process. Attendance: `EKParticipant.isCurrentUser` plus `participantStatus` (accepted, declined, tentative, pending…) tells whether *the user* accepted ([developer.apple.com/documentation/eventkit/accessing-calendar-using-eventkit-and-eventkitui](https://developer.apple.com/documentation/eventkit/accessing-calendar-using-eventkit-and-eventkitui); [EKParticipant](https://developer.apple.com/documentation/eventkit/ekparticipant)). `expo-calendar` exposes attendees with `status` and `isCurrentUser` on iOS and needs full access for any read ([docs.expo.dev/versions/latest/sdk/calendar](https://docs.expo.dev/versions/latest/sdk/calendar/)).

**The correctness caveat the brief asks about, answered:** the user's own acceptance *is* readable, so "you accepted" vs "you were invited" can be told apart. **Another person's** attendance is readable only as their invitee status, which is not presence; and an attendee is an email or a name string, not a person in People (the plan's own matching rule: "never first-name only"). An event titled "Dinner" with no attendees says nothing about who. So calendar evidence is reliable for *when the user plans to be somewhere* and unreliable for *who they will be with* unless the title names a picked person.

**Verdict:** unchanged from T7/D6 and CC-25: not in onboarding; Explore later as an evidence source for a planned-encounter prompt ("You're seeing David on Thursday" as Moment detail), always requested in context, never at launch. There is no per-event authorisation in iOS; full access is the only read grant, which is the trust reason it stays out of the first session.

### 2.6 Photos

(a) `PHPickerViewController` (and `expo-image-picker`) needs no permission; the user picks the photo in a system process; limited library access exists for anything deeper ([developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app](https://developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app); [docs.expo.dev/versions/latest/sdk/imagepicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)). (a/c) PhotoKit exposes no People/face names to third parties; face metadata in files carries positions, not names. Any naming would be Kinship's own face recognition, which the product rules make a non-starter.

**A narrow shape that fits:** one picked photo plus one sentence, told as a Tell ("Chris and me at the top of Half Dome. He's been training all year."). The sentence is the memory; the photo is an attachment on the source, shown on the page as a shared moment. It is not an accelerator for the first session; it is a nicer way to tell a shared moment later.

**Verdict:** reject library scanning and any identity inference outright; the photo-plus-sentence Tell is plausible later and needs its own storage, privacy-label and deletion work (the plan's "Photo input: Later").

---

## 3. Social platforms and messages

### 3.1 Instagram

(a) The Instagram API with Instagram Login serves professional accounts (businesses and creators) for publishing, comments, insights and messaging; "a permission only allows access to data created by the app user who granted the permission"; **no followers, following or friends endpoints**. The Basic Display API ended 4 Dec 2024: "there will no longer be a set of Instagram APIs for consumer developer apps." Meta's Platform Terms prohibit processing platform data to build or augment user profiles without valid user consent and prohibit buying or selling it ([developers.facebook.com/docs/instagram-platform](https://developers.facebook.com/docs/instagram-platform/overview/); [the Basic Display notice](https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api/); [Platform Terms](https://developers.facebook.com/terms/)).

### 3.2 LinkedIn

(a) Sign In with LinkedIn (OpenID Connect) returns the member's own name, picture, locale and email; the Connections API "is restricted to those developers approved by LinkedIn"; connections size is partner-only; "You cannot browse connections" ([Sign In with LinkedIn](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2); [Connections API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-api)). (c) hiQ v. LinkedIn ended in a 2022 consent judgment and permanent injunction against scraping in breach of the User Agreement; the CFAA holding does not make scraping safe under contract.

### 3.3 Facebook

(a) `user_friends` returns only friends who also use the app, and Meta's reference notes the edge was removed after Graph API v3.2 (verify before relying on it); the April 2018 restrictions removed relationship status, education, work history and event guest lists ([permissions](https://developers.facebook.com/docs/permissions/); [restricting data access, 2018](https://about.fb.com/news/2018/04/restricting-data-access/)).

### 3.4 Data exports

(b) LinkedIn's "Download your data" is desktop-only, takes minutes to a day, and includes connections (name, URL, email, company, position, date) and messages; (c) Instagram's export is a ZIP by email with posts, DMs, followers and following (help article body not retrievable; third-party list). (d) For a phone-first first session these are the highest-effort route imaginable, and what they deliver is a list of names and job titles, i.e. the bottom-right of the framework in `00` §6, with no provenance Kinship can show and nothing about what is going on in anyone's life.

### 3.5 iMessage and message excerpts

(a) The Messages framework exists for iMessage apps; `MSConversation` exposes opaque participant UUIDs and the app's own messages, no transcript, no history ([developer.apple.com/documentation/messages/msconversation](https://developer.apple.com/documentation/messages/msconversation)). There is no API to read message history on iOS; the macOS `chat.db` is not an iOS option.

**An explicit excerpt the user pastes or shares** ("Susan: the venue fell through, I'm so stressed") is possible today by paste and later by the share extension. Two rules make it safe: the memory is grounded in the words the user kept, with provenance "You shared · from a message"; and the *other* person's words are evidence, never a statement Kinship composes as its own ("Susan is stressed" from Susan's own text is fine; a model summary of a thread is not). The friend's privacy interest is real: this is the user quoting a friend to their own private notebook, which is the same act as telling a note, and no automatic ingestion ever.

**Verdict for all of §3:** reject the platforms and the exports; allow explicit excerpts only as a Tell the user composes, later through the share extension.

### 3.6 Google Contacts (People API)

(a) `people.connections.list` returns the signed-in user's contacts with birthdays, relations, events and biographies under the `contacts.readonly` scope; Contacts scopes are "sensitive" (app verification: verified domain, privacy policy, demo video) and not on the restricted list that requires a CASA assessment on the pages read ([developers.google.com/people/api/rest/v1/people.connections/list](https://developers.google.com/people/api/rest/v1/people.connections/list); [support.google.com/cloud/answer/13464321](https://support.google.com/cloud/answer/13464321)). (d) It duplicates iOS Contacts for most iPhone users, adds an OAuth token Kinship would hold server-side (a new processor and a D2 disclosure change), and gives nothing iOS Contacts does not. **Reject for V1.**

---

## 4. Other credible low-friction methods

| Method | Assessment |
|---|---|
| **The return-check prompt** ("Anything worth remembering from talking with Ben?") | Already built; the single best progressive source (`04` §4). Zero platform cost |
| **Siri / Action Button** (Alpha direction, CC-25 step 1) | Capture where life happens; an App Intent that writes to the App Group. Same words, same pipeline. The first capture-anywhere step by decision; it reduces the *reach* cost of a Tell, not its understanding cost |
| **A Tell from a Today Moment's detail** | Exists in spirit (Message → return → prompt). Nothing new |
| **The "You could mention" sheet as a cue** | K26; it shows what Kinship knows at the moment the user acts, which is also when they notice what it does not know. A quiet "Tell Kinship about Susan" on that sheet is the lowest-cost gap-filling prompt in the product, and it is user-initiated |
| **Clipboard paste detection** | iOS shows a paste banner; reading the clipboard unasked is exactly the creepiness to avoid. No |
| **Email** | Mesh's model; wholesale access. No |
| **Contacts' "recently added" or "recently contacted"** | Not available to apps |

---

## 5. Recommended, deferred, rejected

**Recommended now (no new capability):** keep Contacts as built; teach keyboard dictation by copy; rely on the return-check prompt and the hand-off sheet for progressive capture.

**Deferred, already on the roadmap, nothing to add:** Siri / Action Button (Alpha direction); an on-device dock mic (Explore later, step 2); a text share extension (Explore later, step 3); calendar as an evidence source (Explore later). This document changes none of their order; `04` says what would pull the share extension forward.

**Deferred, new and narrow, needing their own decision later:** Contacts anniversaries as a dated line; a related-name hint inside "Who is Pedro?"; the photo-plus-sentence Tell; Journaling Suggestions as a cue for a planned-encounter prompt.

**Rejected:** the Contacts Notes field; social platform APIs and data exports; any message-history ingestion; photo library scanning or face naming; Google Contacts for V1; clipboard reading; email.

Every rejected item fails the same two tests: the source cannot name a person the user picked with provenance Kinship can show, or it reads about people who did not agree.
