# Founder native-pass feedback (dogfood-v2 build)

The founder's notes from using the build on their iPhone, logged as they arrive.
**Status: logged only.** Nothing gets acted on until the founder says so.

## Burst 1: 5 Oct, about 9:53–9:56

Screens: Tyler Shaffer (empty page, with the "About Tyler" Tell sheet open over it), and Ben Oxnard (Lately and Coming up).

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F1 | Person page: edit / add | It should be easier to edit someone or add details about them. The small edit icon is too small and unclear. | The third control in the bottom bar (after Message and Call) is drawn as a narrow, clipped pill with only a pencil icon showing. It looks squeezed rather than meant to be that size. |
| F2 | Tell sheet: submit | When telling Kinship something, nothing clearly submits or confirms it. The text covers any button you could tap. | "About Tyler" sheet: the field and the keyboard fill the screen. No Keep / send button is visible above the keyboard. |
| F3 | Keyboard | There is no way to dismiss the keyboard. | Same sheet: the field is single-line with a return key, and the area above it doesn't dismiss the keyboard. |
| F4 | Remembering: whose fact | The Tell about Ben said Ben wants to play games with the founder and their brother John. Ben's page instead leads with "John is the writer's brother". Both are the founder's brothers, so this is misleading on Ben's page. | Two more things on that page: (a) "the writer" is internal wording that leaked into what the user sees; it should be "your brother" or similar; (b) a fact about John is filed under Ben's Lately. |

## Burst 2: 5 Oct, about 9:58

Screen: What Kinship knows about Ben, with the "Forget this?" dialog open over "John is the writer's brother".

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F5 | Correcting a fact | There's no way to edit a fact Kinship kept, only delete it. The founder wanted to change it to "John and Ben are the writer's brothers". | Each line offers its person ("Ben Oxnard"), its kind ("Something true") and "Not this". Nothing on screen says the words themselves can be changed. "Keep it" in the Forget dialog is the same label as the Tell button, with a different meaning. |
| F6 | How the user is named | Doesn't like being called "the writer": it's too impersonal. It should use the name they registered with. | Ties into F4(a). Open decision: use the user's own name ("[your name]'s brother"), or "your" ("your brother")? |

## Burst 3: 5 Oct, about 10:01

Screen: Ben Oxnard, "About Ben" Tell sheet with the keyboard dismissed and a two-line note typed.

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F7 | Tell sheet: submit (confirms F2) | Still no way to submit a fact. | The keyboard is down and the text has wrapped to two lines, yet there is still no send / Keep button anywhere in the sheet. So the button isn't just hidden behind the keyboard: it's missing (or drawn off screen) in this sheet. Blocking: the person-page Tell can't be used at all. |

## Burst 4: 5 Oct, about 10:02

Screen: People with the Settings sheet open.

| # | Area | Founder's feedback | What the code / screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F8 | Settings: Contacts | What's the point of the Contacts section if there's nothing to adjust? | It's a disclosure only: a title and one sentence (`src/features/people/SettingsSheet.tsx`), with no control and no tap action. Options: make it act (show whether access is allowed, open iOS Settings to change it, and "Add from contacts"), or fold the sentence into the Understanding section and drop the row. Also: the People list shows "the writer" in Ben's preview line (F4/F6). |

## Burst 5: 5 Oct, about 10:04

Screen: the welcome (sign-in) screen.

| # | Area | Founder's feedback | What the code / screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F9 | Welcome: layout | It reads as a wall of text and isn't neatly organised. | Kicker, headline, subline, then three ruled lines. All of it is the same weight of body text, so nothing leads. "See how it works" sits left of the text margin: it's pulled out by `marginLeft: -space.l`. |
| F10 | Welcome: sign-in buttons | The Apple and Google buttons are oriented wrong. It looks cheap. | **Apple button is broken:** no black fill, white text on paper, and the logo stacked above the label instead of beside it. Its layout lives in a `Pressable` style *function*. Hypothesis: NativeWind (`jsxImportSource: "nativewind"`) drops function styles on `Pressable` in the native build. That could also explain the squeezed pencil button (F1) and any other control styled the same way. Needs a device check. Google and email are small, quiet text links in a row under the broken Apple button, so the hierarchy reads as unfinished. |
| F11 | Welcome: orientation | Would prefer a rotating carousel or a fun animated design to orient people who are signing in. | **Design-direction question for the founder.** The Design Direction asks for no decorative motion, and "See how it works" already exists as a tap-through. Options: (a) turn the three lines into a calm, swipeable 3-panel carousel (Tell → Remember → Bring back), using the "See how it works" content, auto-advancing slowly, with Reduce Motion respected; (b) one quiet illustrated animation, e.g. the sprig growing a leaf per step. Needs the founder's choice before anything is built. |
