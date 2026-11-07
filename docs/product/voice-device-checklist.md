# Voice (E18): native build and device checklist

**Status: NOT READY.** Built and tested in Jest only. Needs a new native build (it adds a native module, so an
over-the-air update can't deliver it) and a walk on real phones before it can be called READY FOR FOUNDER NATIVE PASS.

**What it is.** Founder decisions of 7 Nov 2026 (`approved-design-coverage.md`, "Voice (E18)"): the Listening board is
re-confirmed, the microphone permission is unblocked, a new native build is approved, `voice_capture` is on only for
`21bb55a0-…` and `97748654-…`, and the mic shows only where on-device transcription is actually available.

## How it works

- **Engine:** the phone's own recognizer through `expo-speech-recognition` (~3.1.3, built for Expo SDK 54).
  `src/platform/speech.ts` starts every session with `requiresOnDeviceRecognition: true` and never asks for a
  recording (`recordingOptions.persist: false`). There is no server path.
- **When the mic shows** (`src/features/tell/voice/useVoice.ts`): the account has `voice_capture` **and** the
  phone passes the check:
  - iOS: `supportsOnDeviceRecognition()` and the phone's language is one the recognizer knows. With
    `requiresOnDeviceRecognition`, iOS fails a request rather than send it to a server.
  - Android: **13 or later** (12 and older can only *prefer* offline, so they get no mic), on-device recognition
    available, and the phone's language **downloaded** for on-device use.
  - Not on the web, and not in a binary built before this change (the JS can arrive by update ahead of the build).
  - A start that fails because of the language or the service hides the mic for the rest of the session.
- **Flow:** mic → Listening (night palette, the words as they arrive, the user's people underlined, the lock line,
  Stop) → the words go into the Tell → the user reads them and taps Keep/Send. The note is kept with
  `source = voice` and `transcript_meta {on_device: true, locale, duration_s}`.
- **Permissions:** iOS asks for the microphone only (the on-device path doesn't need speech-recognition
  authorization in this module); the speech-recognition description is in Info.plist as the module requires.
  Android requests `RECORD_AUDIO`. `src/lib/__tests__/permissions.test.ts` holds the exact list.

## Build

After merging to `main`:

```
eas build --profile dogfood-v2 --platform ios
```

Install it on the founder's iPhone (internal distribution), sign in as an account with the override.

## Walk on the phone

Mark each ✓ or ✗ with a screenshot.

1. **Mic only where it should be.** Today/People: the empty Tell field's round button is the mic; with words it is
   Send. The notebook Tell page has a mic beside Keep. An account **without** the flag sees no mic anywhere.
2. **First tap.** The iOS microphone prompt shows Kinship's text ("…turned into words on this phone, and the audio is
   never saved."). Allow.
3. **Listening opens fast** (under 300 ms to the screen; listening has begun). Night palette in light mode too. Label
   "LISTENING"; from a person, "LISTENING · FOR <name>".
4. **Words arrive** as you speak; a person in People is underlined when you say their name. The voice's line moves.
   The lock line reads "Transcribed on this phone. The audio is never saved."
5. **Stop** puts the words in the field / on the page. Nothing is kept until Keep/Send. Keep: the note is
   understood as usual.
6. **Airplane mode:** steps 3–5 still work.
7. **No audio leaves the phone:** with a proxy (Charles/Proxyman) on, listening for 30 seconds sends no request
   carrying audio; Keep sends only the note's text, as typed notes do.
8. **A call arrives mid-listening:** listening ends with the words heard so far; nothing is lost.
9. **Permission denied** (Settings → Kinship → Microphone off): "Kinship can't hear you yet." with Open Settings and
   Type instead; nothing is kept.
10. **Back / escape:** Android back and the VoiceOver escape gesture end listening like Stop (words kept in the field).
11. **VoiceOver:** the mic reads "Say it instead"; Stop has its hint; words are announced as they arrive.
12. **Largest text size:** the label, words, lock line and Stop stay readable; nothing is cut off.
13. **A long note:** speak for over a minute; the words keep coming. Listening finishes by itself at three minutes.
14. **Device × language matrix** (plan E18): iPhone SE on iOS 17, a 15 on iOS 18, a 16 Pro on iOS 26 × en-US/en-GB.
    A phone or language without on-device recognition: **no mic**, typing works.

## Rollback

Delete the `voice_capture` rows from `user_flag_overrides`. The mic disappears at the next foreground.
