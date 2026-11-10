# Quote Proposal for TJ

A sideways-moving proposal deck (one `translateX` track, never a scroll) with a live sketch of TJ's photography site: a particle intro with a black-hole cursor, then Work, About, Index and Book. Paper-white deck, night-black demo: single theme on purpose.

- Everything is in `index.html`: one `<style>`, one inline `<script>`, Google Fonts. No build step.
- `main` deploys to GitHub Pages: https://sigmaone-eth.github.io/tj-proposal/. A pushed commit is live within minutes, and the client may be looking at it.
- The parent folder (`Documents/tj-proposal/`) also holds `tj-universe.html` and `preview/index.html`: older or artifact variants of the same page, outside this repo. This repo's `index.html` is the one that ships.

## The CSP hash

`index.html` carries a Content-Security-Policy whose `script-src` is the sha256 of the inline script. **Any edit to the script, even one character, blocks the whole script in the browser** until the hash is updated. After every script edit run `node scripts/check.mjs --fix-csp`.

## Checks

- `node scripts/check.mjs`: inline script parses, CSP hash matches, local refs and `#` anchors resolve, CSS braces balance, document skeleton intact.
- Visual changes also need a look in the browser (`npx http-server . -p 5173`), at desktop and phone width, stepping through every slide.

## Delegation (`/delegate` skill)

Claude decides per change whether to do it or hand it to a worker, and says which in one line before starting. Tools and template: `C:\Users\Estefano\Documents\agent-orchestrator`.

**Before delegating**
- Work on a branch (`delegate/<topic>`), never directly on `main`: `main` is what TJ sees.
- Clean git tree outside `tasks/` (gitignored, so specs, logs and costs are never published).

**Who does what here**
- Everything lives in one ~63 KB file, so only one worker task at a time can touch it.
- **DeepSeek**: proposal copy (scope, pricing wording, timeline text) when the spec lists exact slides. It returns the whole file, so name the slides it may change and verify the diff touches only those.
- **Codex**: mechanical edits across the file (rename a section everywhere, accessibility pass, fixing check failures). It can run `node scripts/check.mjs --fix-csp` itself.
- **Keep it yourself**: the particle intro and black-hole cursor, slide motion and layout, pricing decisions, anything judged by eye.

**Every spec**
- `Allowed files: index.html` (plus `README.md` if needed). Never the parent-folder copies.
- `Done when:` `node scripts/check.mjs` prints `check: OK` (after `--fix-csp` if the script changed), plus a visible result Claude confirms in the browser.

**After a worker runs**: read only the summary, run the check, `git diff --stat` and read the diff, preview every slide, commit on the branch. Merge to `main` (= publish to the client) only when the user says so.
