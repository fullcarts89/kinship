# Kinship 2.0: post-D1 product build summary

**Branch:** `claude/awesome-edison-3cuf6z`, with commits `017f05f`, `34add93` and `0de31df` on top of `main` at `08d5d87`. It has been pushed but not merged, and no PR is open.

**State of production:**
- No accounts are enabled.
- No user ids have been requested.
- `shell_v2`, `tell`, `ai_extraction` and `memory_v2` are all off for everyone.

## 1. D1 docs follow-up (merged)

The pending D1 doc edits were merged on their own:
- `docs/phase1/checkpoint-d1-tell-memory-loop.md`: merge `8415943`, migrations, schema fingerprint, gateway v2 byte parity, flags off;
- `docs/ops/supabase-settings.md`.

They went in as [fullcarts89/kinship#15](https://github.com/fullcarts89/kinship/pull/15), merged as `08d5d87`. The PR was docs only.

## 2. Quiet Herbarium design system (E07)

This was built from the approved sources:
- the Design Direction doc;
- the Design Exploration canvas boards;
- `KINSHIP_2_COMPLETE_PLAN.md`.

**Tokens.** `src/design/tokens.ts` is now the only source of design values:
- the approved palette, in light and night;
- the type scale, spacing (4…64, gutter 26), radius by role and motion (with reduce-motion variants);
- the single sheet shadow;
- Apple button colours.

**Fonts.**
- Newsreader is instanced from the OFL variable font at the optical sizes the scale uses (`assets/fonts/newsreader/`).
- Instrument Sans comes from Expo Google Fonts.
- The 2.0 screens no longer use the DM fonts; 1.0 still does.

**Components** live in `src/ui/`, with no Card:
- Moment, Row, Token/TokenRow, Provenance, Sprig;
- TellField, Sheet, Pill, QuietLine, the text styles (including Label), Screen, NavBar.

**Night.** The app now follows the system appearance inside the 2.0 shell. 1.0 stays light.

## 3. Identity-only sprig (E08)

- `src/ui/sprig/generate.ts` draws the sprig as a pure function of the person's id.
- There is no history input, and every sprig has the same total leaf area.
- There are six form families with 5–9 nodes, and the terminal is never a flower.
- Tests over 500 ids cover determinism, the API taking only the id, constant leaf area, fit inside the box, and family spread.

## 4. Today + People + Tell, and the D1 surfaces rebuilt

**Routes:**

| Route | Screen |
|---|---|
| `app/v2/(main)` | Today and People tabs; the tab bar is the Tell field plus the two-item nav |
| `app/v2/person/[id]` | The relationship portrait |
| `app/v2/person/[id]/knows` | What Kinship knows about the person |
| `app/v2/source/[captureId]` | The Source view |

**Today** shows one moment, up to two quiet lines, or "Nothing needs you today."

**People** is search-first. Each row is a sprig, a name and one live line. Adding someone is: + → name → Done. Settings (the understanding switch and sign out) opens from the header.

**The relationship portrait** shows only the sections that have something in them: Lately, Coming up, You said you'd, Between you. Each line carries its provenance. Tapping a line opens a focused correction sheet.

**Tell:**
- `TellFlowProvider` keeps D1's behaviour unchanged.
- A clear note shows a "Kept: … · Undo" line.
- A note that needs a look opens the review sheet, restyled to board 1.
- A single question becomes the whole sheet.
- From a person's page, Tell opens as a sheet.

**Consent.** A one-time sheet shows the approved D2 sentence (D3 consent) before anything is understood.

**Onboarding.** A 2.0 account skips the 1.0 onboarding.

## 5. Phase 2 slice: reasons v0, hand-off and return check

**Migration** `supabase/migrations/20261005090000_v2_reasons_v0.sql` is forward-only and reaches production only through a merge. It adds two functions:
- `reasons_refresh` is service-role only.
- `refresh_my_reasons` acts only on `auth.uid()`.

Together they create deterministic `upcoming_event` and `event_followup` reasons from exact-day, non-sensitive events. The windows follow plan §13. Reasons whose evidence changed are suppressed, and passed windows expire. 22 pgTAP assertions cover this.

**Selection and copy.** `src/features/today/todayModel.ts` ranks reasons with the plan §13 formula and a threshold of 55. The copy is fixed templates plus the user's own words, with no model involved.

**Hand-off.** `src/platform/handoff.ts` opens Messages, Phone, FaceTime or WhatsApp with nothing pre-filled. Numbers are read from the device contact at tap time and never stored.

**Return check.** Today asks "Did you reach Ben?" between 10 minutes and 12 hours after a hand-off. Only "Yes" records a `contact_events` row.

## 6. 2.0 welcome and sign-in

**Screen.** `src/features/welcome/` uses board 1's setup composition:
- the promise in the display serif;
- one sprig;
- Continue with Apple as the primary action (black, or white at night, per Apple's rules);
- Google and email as quiet options, with email in a sheet;
- busy and failure states in words.

The existing auth plumbing is unchanged.

**Promise screens.** These are deferred to Phase 3 onboarding; the decision is documented.

**When it shows.** Before sign-in the account isn't known, so the look comes from either:
- the build: `EXPO_PUBLIC_V2_ENTRY=1`, set by the new EAS profile `dogfood-v2`; or
- this phone's last shell, a device hint kept across sign-out.

Everyone else keeps the 1.0 sign-in.

**After sign-in** there is no `/loading` animation and no 1.0 onboarding: the app goes to the consent sheet, then Today.

**Splash.** The dogfood build only gets a paper splash with a sprig, with a night variant, via `app.config.ts`.

## 7. Documentation

| Document | Contents |
|---|---|
| `docs/phase2/quiet-herbarium-build.md` | Tokens, components, sprig, IA, reasons; a design-fidelity review per screen with side-by-sides (`screens/compare/`) and a deviation log |
| `docs/phase2/v2-flow-friction-audit.md` | 1.0 → D1 → built, per journey: taps, screens, choices, kept trust friction, proposals |
| `docs/phase2/wife-dogfood-readiness.md` | The gate, screenshots (light/night/SE), the sign-in check table, the native-device checklist, rough edges, handover steps |
| `docs/phase1/checkpoint-d1-tell-memory-loop.md` | Now separates behavioural D1 completion from the visual product |
| `docs/ops/analytics.md` | Reason type values |

## 8. Checks

| Check | Result |
|---|---|
| Jest | 273/273 in 43 suites |
| pgTAP | 431 |
| Deno | 117 (no edge-function changes) |
| `tsc` | clean |
| ESLint | 0 errors, 131 warnings (same as `main`) |

## 9. Not done / open

**Native-device pass.** Nothing has been checked on an iPhone, because there is no device or EAS access here. Every screenshot is a web render. This blocks the wife's build.

Rough edges:
- no voice capture;
- Terms and Privacy Policy pages are still 1.0-styled;
- the app icon is still 1.0's;
- Today is quiet until there are dated events;
- sensitive events don't produce reasons in v0;
- reasons refresh when Today opens, not on a schedule.

**Next steps:**
1. Your review.
2. Merge with a merge commit, then verify schema parity.
3. Build with `eas build --profile dogfood-v2`.
4. Do the device pass.
5. Enable her account only.
