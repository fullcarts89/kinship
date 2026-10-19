# 05 · Implementation and roadmap implications

**Status: EXPLORATORY · UNAPPROVED. Nothing is scheduled; the canonical roadmap is unchanged.** Sizes are relative (**S** a day or two · **M** a week · **L** more). No production code was written or changed.

## 1. Three kinds of change, kept apart

| Kind | What it covers | Who decides | In this exploration |
|---|---|---|---|
| **Visual layer** | Colour, type, marks, illustration, iconography, layout within the approved composition, animation | A founder design decision, recorded in `approved-design-coverage.md` | Everything in the six directions |
| **Interaction design** | Entry points, navigation, hierarchy, controls | Founder approval per change | None proposed. The band on a page opening Edit is the only new tap and it duplicates the existing Edit control |
| **Product behaviour** | Today eligibility and ranking, memory, trust, the return check, consent, notifications | Product decisions outside this exploration | None proposed, and none implied by any direction |

The first Tell shown in scenario A (one person, one story) is a **proposed interaction change** from the rapid-understanding exploration (PR #52) and is drawn here only so the directions can be judged on it; adopting it is that exploration's decision, not this one's.

## 2. Finalist assessment

### F · Woven

| Area | Assessment | Size |
|---|---|---|
| Tokens | Add `linen`, `teal`, `tealText`, the eight floss colours (marks only, never text), and the night set to `src/design/tokens.ts`; keep the single-meaning rule (`accent` = understood / your promise). Contrast tests extend to the new text pairs | S |
| Fonts | Gabarito (500/600/700) and Instrument Serif (regular/italic), both OFL, as static instances in `assets/fonts/`; Instrument Sans unchanged. If F′ wins, Newsreader stays as today | S |
| The band | `src/ui/band/generate.ts`, the sprig generator's twin: FNV-1a seed from the person id; four weaves; a triad from the floss palette with a colour-vision-checked table; output as `react-native-svg` paths; **width is a prop set by the place, never by data**; a CI property test asserts that the drawing depends only on the id and that every band at a given place has the same bounds (replacing the sprig's area test) | M |
| Charms | Five small SVGs (star, flag, rings, knot, thread) in `src/ui/charms/`; chosen by `ReasonType`; a test that `sensitivity !== "none"` never gets one | S |
| Today | `Moment.tsx`: the band under provenance; charms at the top right; the plain variant as now | S |
| People | `Row.tsx`: the band in place of the sprig at 56 × 10 | S |
| Portrait | `PortraitView.tsx`: the band across the top; the remembered variant at 55% | S |
| Motion | Weave: an animated width on an overflow-hidden view (native driver); the nod: a rotate on the mark; Understood: the existing underline draw; Into a person: a shared-element transition (`react-native-screens` shared transitions or a manual overlay; prototype on device first) | M |
| Reduce Motion | `AccessibilityInfo.isReduceMotionEnabled` already gates the approved motions; the twins are fades | S |
| VoiceOver | The band is `accessibilityElementsHidden`; the name is the label; charms are decorative | S |
| Dynamic Type | Type scales by the approved `maxScale`; the band's height is fixed; charms move above the statement at AX sizes | S |
| Localisation | Nothing in the band or charms carries text; long strings reflow as today | — |
| Night | Floss unchanged, ground and ink swapped; the contrast test covers it | S |
| Older iPhones | A band is ~12–20 SVG paths; 110 rows is ~2,000 paths, within what the sprig list already does; profile the list on the oldest supported device | — |
| Maintenance when reasons and Ask grow | A new kind of reason needs one charm (or none); Ask results need no new art (a result row is a line with its source, and a person's band where one exists) | low |
| **Total** | | **M–L** (two to three weeks of view work; no backend, no migration, no gateway change) |

### A · Garden Letter

As sized in round 2 (`../today-redesign-2026-10/round-2/04-implementation.md`): tints, the sky, the sundial, the kicker and 36 pt, the quotation rule, six engravings, the meadow, day numerals, the return composition, Resolve, People's serif names and index, the portrait. **M–L**, about three weeks, already costed.

### B · Bloom

| Area | Assessment | Size |
|---|---|---|
| Tokens and fields | Cream and the eight petal colours; four field tints in light and four in night; a rule that `sensitivity !== "none"` renders no field, tested | S |
| Fonts | Fraunces is a variable font with custom axes (SOFT, WONK); React Native cannot set axes at run time, so each used instance is exported statically (Display 700 soft/wonk, Text 500, italic) and licensed under OFL. DM Sans static | S |
| Flower marks | A generator like the sprig's (petals 5–8, three shapes, two colours, fixed radius) with the identity-only CI test | M |
| Occasion art | Four flat drawings now (wreath, cake, rings, bow), more as kinds of reasons grow; a maintenance commitment comparable to the engravings | M |
| Petal drift | 10–14 animated views once on a birthday; skip under Low Power Mode and Reduce Motion; consider Rive only if the drift is extended | S–M |
| Fields vs long statements | A rule by statement length (as round 2's view rules) to drop the art to 104 px and the field's top padding | S |
| **Total** | | **L** (three to four weeks), with the highest ongoing illustration cost of the finalists |

## 3. Common to all finalists

- **Reuse.** `Screen`, `Pill`, `Row`, `Provenance`, `Sheet`, `Moment`, `QuietLine`, `TodayView`, `PeopleView`, `PortraitView`, the hand-off and return views, the Tell pipeline views: all reused; the change is tokens, fonts, one mark component and one art component.
- **Animation libraries.** Reanimated for everything in `04`; `react-native-svg` for marks and art; Rive only for an illustrated direction's signature pieces, and only after an on-device profile (the only benchmark found is Android, old hardware: Lottie ~17 fps vs Rive ~60 fps).
- **GPU and battery.** Opacity, transform and clip only; no blur, no blend modes in the finalists (Orbit's blends were a reason it is not one); shadows limited to the sheet.
- **Screen readers.** Marks and art decorative; the person's name and every line are the elements; the return question and its observed fact read as one element.
- **Localisation.** No text in artwork; the kicker templates are the only new strings.
- **Night.** All three have a night set; contrast tests extended.
- **Reduce Motion.** Fades at 150 ms, as approved.

## 4. Roadmap implications (no change to the canonical sequence)

- **Now:** B6's report review, B7–B9, the employer evaluation and the household dogfood proceed as committed (CC-25). Nothing here starts a build.
- **The approved next capabilities** (showing-up measurement, memory-native reasons, the minimal private push, the trust floor) are unaffected; a kicker per new reason type and a charm or none is all any finalist needs from them.
- **Ask and additional intelligence stay in Alpha.** Every finalist renders the Ask row and typed results on the same surfaces; none needs anything from Ask to ship.
- **Timing of a production-wide redesign is unchanged:** after the memory foundation and the initial household dogfood, before broader Alpha, on the founder's explicit decision. A visual-layer change can be built behind the existing `shell_v2` structure without a new flag.

## 5. A recommended adoption sequence, if the founder decides to proceed

1. The founder's decisions (`06`): the direction; the voice; the fate of the sprig; the band's rules.
2. The study (`08`), two weeks, before any production work, because its outcome can change step 1.
3. Tokens, fonts and the mark generator with its CI test (the trust-relevant pieces first).
4. Today, then People, then the portrait; each with its snapshot tests light / night / AX1.
5. The motion concepts, on a device, one at a time; Reduce Motion twins alongside.
6. A founder native pass; readiness NOT READY until then; the wife's build only after that.
