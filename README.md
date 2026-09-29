# ThumbType Lab

A standalone PWA for measuring thumb touch accuracy and typing speed on a phone keyboard.

## Run it with GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `main` and `/ (root)`, then save.
4. The app will be available at `https://neonemmy.github.io/thumbtype-lab/`.

On iPhone, open that URL in Safari and choose **Share → Add to Home Screen** to run it as a standalone app.

## What it measures

- left-thumb, right-thumb, and two-thumb typing
- typing speed in WPM
- substitutions, skipped characters, and extra taps
- raw touch position relative to the intended key center
- horizontal/vertical bias and mean radial touch error
- per-mode speed-vs-accuracy comparison

Results can be shared or downloaded as JSON.


## Local development and checks

Serve the repository with `python3 -m http.server 8765` and open
`http://localhost:8765`. Run `node tests/verify.cjs` with Node.js 20 or newer
for dependency-free regression checks covering good/bad cues and audio lifecycle, all
nine runs, sample exports, wrong keys/gaps, unavailable audio, and failed-share
fallback versus cancellation. These use mocked DOM and audio APIs; they do
not replace browser testing or listening on an iPhone.

Before release, test Safari and the installed PWA for comfortable sound,
Silent Mode behavior, background/foreground recovery, JSON delivery, and
offline reload. Instructions → Build diagnostics should show the expected
and actual cache versions matching.
