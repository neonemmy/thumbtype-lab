# ThumbType Lab handoff

## Goal and context

Continue work on `neonemmy/thumbtype-lab`, a static iPhone touch-keyboard accuracy PWA comparing left thumb, right thumb, and both thumbs over three phrase repetitions each.

The user found the previous brief dual-tone tap feedback too hard to hear. They requested continuous dual-voice accuracy feedback: start both voices in unison on Go, update their separation on every tap based on normalized distance from the intended key center, vary the magnitude between runs, and show/save the magnitude for comparison. Preserve typing/alignment behavior and PWA cache diagnostics.

Original ChatGPT conversation: “Create Touch Prototype”, conversation ID `6abc01af-0d64-83e9-a881-454afb021d4b`.

## Checkout and current state

- Checkout: `/Users/colin_burgess/projects/thumbtype-lab` (note the underscore in the username).
- Branch when checked: `main`.
- HEAD when checked: `8e92eb2` — `Bump PWA cache for live diagnostics`.
- Five implementation files have uncommitted changes: `accuracy-audio.js`, `app.js`, `index.html`, `instructions.html`, `sw.js`.
- Changes have been applied to this checkout, but have NOT been committed, pushed, or deployed by this chat.
- This handoff is an additional new file. Inspect the current diff before continuing; preserve existing work.

## Implemented behavior

- Replaced the old AudioContext prototype interception in `accuracy-audio.js` with an explicit `window.ThumbTypeAudio` controller used by `app.js`.
- Go starts two sustained sine oscillators at 900 Hz. One stays fixed; the second is detuned, with 25 ms smoothing, on each tap.
- Target is the highlighted intended key BEFORE processing the tap. Later Levenshtein alignment can assign a different expected character; the audio record preserves `intendedKey` separately.
- Normalized distance: `hypot(dx / (keyWidth / 2), dy / (keyHeight / 2))`.
- Separation: `scaleCents * min(normalizedDistance, 2)`. Center = zero; horizontal/vertical edge midpoint = one unit; corner = sqrt(2). A missing/zero-size target returns null distance and zero detune.
- Scale schedule: `[50, 150, 300][(modeIndex + repetition - 1) % 3]` cents per normalized distance unit.
  - Left thumb: 50, 150, 300.
  - Right thumb: 150, 300, 50.
  - Both thumbs: 300, 50, 150.
- These exact scales and linear mapping were implementation choices for experimentation, not user-selected preferences. Adjust after listening feedback.
- Current scale appears in the ready dialog and during the run.
- Voices stop at phrase completion, reset/new phrase, navigation to instructions, page hide, and backgrounding. After returning from background, the next deliberate keyboard tap restarts the voices and applies that tap's distance.
- Existing short UI sounds remain; Go no longer plays the closing chime over the unison start.
- AudioContext initialization is guarded so unavailable audio does not prevent typing.

## Data and results

- Raw payload version is now 17.
- Top-level `audioFeedback` describes reference pitch, scales, mapping, normalization, target convention, and schedule.
- Every finalized sample (including skips/extras) has `audioScaleCents`.
- Each actual tap has `audioFeedback`: intended key, reference Hz, scale cents, actual detune cents, secondary Hz, normalized distance, and audio state at the tap.
- Per-repetition summary, results UI, and shared text include scale, WPM, and error rate.
- Schedule is a fixed exploratory rotation; results are not a controlled estimate of scale effects independent of learning/order effects.

## Web MIDI decision

Verified during this work that MDN browser compatibility data lists Safari Web MIDI as unsupported, with iPhone Safari mirroring Safari. Web MIDI also requires MIDI endpoints and is unnecessary to synthesize these tones. Implementation uses Web Audio.

Sources:
- https://github.com/mdn/browser-compat-data/blob/main/api/MIDIAccess.json
- https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API

## PWA versioning

- Cache: `thumbtype-lab-v17`.
- `app.js?v=8`; `accuracy-audio.js?v=4`.
- Instructions build v8, with matching expected cache and script diagnostics.
- `accuracy-audio.js` now loads BEFORE `app.js`.
- Fixed the previous mismatch between the audio script URL in index and the precache list.
- Preserved live Cache Storage names, controller state, active/waiting/installing worker states, and registration.update() on the instructions page.
- Keep script query versions, index URLs, service-worker asset list, and instructions diagnostics synchronized on future changes.

## Verification completed

- `node --check` passed for app.js, accuracy-audio.js, and sw.js.
- `git diff --check` passed on the actual checkout.
- A temporary Node VM harness with mocked DOM and Web Audio passed:
  - Unison startup and center/edge/corner/capped distance mapping.
  - Oscillator stop lifecycle.
  - Nine complete phrase runs (all three modes/repetitions).
  - Export of 171 centered taps with matching intended keys and zero detune.
  - Per-run scales in summaries and samples.
  - Reset, background stop, and tap-to-resume.
  - Script load order, matching precache URLs, and v17 diagnostics.
- This was a simulation, NOT real browser, Safari, or audio listening verification.
- Temporary harness is outside the checkout at `/Users/colin_burgess/.codex/.chatgpt-projects/g-p-6abc01a909bc81918a5f884f47cc803b/thumbtype-audio-work/verify.cjs`; it reads implementation files relative to its working directory. To rerun against this checkout: `node /Users/colin_burgess/.codex/.chatgpt-projects/g-p-6abc01a909bc81918a5f884f47cc803b/thumbtype-audio-work/verify.cjs` with this repository as working directory. Do not depend on that temporary project-mirror location long term.

## Next steps

1. Review the existing diff and test in an actual browser, especially narrow iPhone layout and expanded results scrolling.
2. Listen on iPhone Safari and installed PWA: Go unlocks audio, voices sustain, centered taps return to unison, all scales are distinguishable, and level is comfortable. Check Silent Mode behavior rather than assuming it from the current instructions.
3. Check background/foreground interruptions and rapid resets for silence, overlapping voices, or errors.
4. Confirm raw export and UI identify each run's scale, including wrong keys/gaps and alignment changes.
5. When publication is requested, commit/push using the repository's normal workflow. After deployment, verify Instructions → Build diagnostics shows actual cache v17 and test offline reload. Do not claim the phone is on v17 before verifying it.

## Why a new Codex chat

The previous chat ran inside a mirrored ChatGPT project, so this checkout was outside its writable roots and applying changes required a separate approval. A local Codex project rooted at this checkout should provide appropriate file context. The long conversation about sidebar/project setup has no bearing on the implementation.


## Local checkout continuation — September 29, 2026

This section supersedes the earlier version and verification notes where they differ.

- Continued from the existing checkout and preserved typing/alignment behavior.
- Found a browser failure when native raw-data sharing rejected. `shareRawData`
  now falls back to downloading JSON on non-cancellation errors; AbortError
  still exits without a download.
- Replaced the unverified Silent Mode guarantee with a device listening check.
- Current assets: app v9, accuracy audio v4, instructions v9, cache
  `thumbtype-lab-v18`. Payload schema stays version 17 (no schema change).
- Moved the temporary harness into `tests/verify.cjs`; run `node tests/verify.cjs`
  from this checkout or use its absolute path from another directory. Added
  wrong-key/gap metadata, share failure/cancellation, rapid audio restarts,
  unavailable AudioContext, and positive timing assertions. README documents it.
- Real in-app browser check: all nine repetitions completed with 171 taps at
  390 × 844; correct scale rotation and expanded results; no captured console
  errors/warnings. At 320 × 568, scrolled results to reach the final controls.
- Local browser diagnostics showed expected AND actual cache v18, a controller,
  and an activated worker. This says nothing about the deployed site or phone.
- After stopping the local server, both instructions reload and navigation to
  the test loaded successfully from cache in the in-app browser.
- Browser raw-data action no longer displayed the sharing failure, but the
  automation download event timed out. Actual file delivery remains unverified;
  VM checks verify the fallback produces the correct JSON Blob.
- Physical iPhone listening, Silent Mode, real background interruptions and
  installed-PWA/offline checks remain outstanding. No commit, push or deployment.
- Prior review findings about terminal-typo completion, interruption time in WPM,
  and end-of-run touch geometry remain outside this audio continuation's scope.

## Good/bad cue revision — September 29, 2026

- User tried sustained feedback on iPhone and found it jarring. Replaced it with
  finite triangle-wave cues: good rises 880/1320/1760 Hz over 120 ms; bad falls
  392/330/262/131 Hz over 250 ms. Soft gain attack/release; new taps fade out the
  old cue. This is an original short game-like descending cue.
- Good means hit matches the highlighted intended key before alignment; wrong
  keys and gaps are bad. Removed scale rotation and its UI/export fields.
- Go is silent. The final tap's cue finishes; automatic completion/modal chimes
  no longer cover it. Reset/background/navigation still stop tap audio.
- Payload schema v18; app/instructions v10, audio v5, cache v19.
- Regression checks pass for cue direction/duration, natural end/rapid replacement,
  silent Go, final chirp, nine runs, exported outcomes, wrong keys/gaps,
  unavailable audio and sharing fallback/cancellation.
- Browser mixed wrong/correct phrase progressed to repetition 2 with no console
  warnings/errors. Local expected/actual cache v19 matched. Physical iPhone
  listening remains the user's next validation.
