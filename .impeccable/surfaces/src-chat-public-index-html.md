---
version: 1
slug: "src-chat-public-index-html"
primary_target: "src/chat/public/index.html"
related_targets: ["src/chat/public/widget.js","src/chat/public/embed.html"]
---

# Surface brief: TruthLayer playground, chat widget, embed demo

Scope: `src/chat/public/index.html` (playground), `src/chat/public/widget.js` (`<truthlayer-chat>`), `src/chat/public/embed.html` (demo host page). Mode: Operate.

Audience and job: docs/dev teams trying TruthLayer locally next to their editor (read the report, fix pages, ask test questions); end customers asking questions in the widget on a product site. Success: in a few seconds the team sees what is wrong, where (file:line) and what the source of truth says; customers see an answer with checkable sources and any known problem.

Constraints: no build step, no external requests, no web fonts; widget lives in shadow DOM, must accept any host `accent` and `theme`; keep all behavior, API calls and copy meaning; friendly, casual, simple English.

## Direction contract

THESIS: Every fact wears a provenance label: what it says, where it came from, when, and whether its attribution holds. Refuses the default of two soft rounded cards with an indigo accent and pill badges.

OWN-WORLD: Gallery-wall green shell (#1e3a36 family) carrying header and chat column; findings and sources are flat white label stock with square 2px corners and hairline rules; brass marks sources of truth, vermilion marks only outdated values, ink grey marks disputed. Marks by shape: solid dot = truth, struck ring = outdated, half-filled = disputed. Tabular mono only for file:line, values and dates.

STORY: The visitor reads the wall: how many labels are wrong, then each label's chain from truth to page with old value struck beside the new. In chat they ask, read a short answer, and see the sources as small labels with age; a known problem appears as a note above them.

FIRST VIEWPORT: 56px green header (TruthLayer, product name, scan summary, AI status). Left 40%: chat column on green, answers on white label stock, input pinned bottom. Right 60%: "Knowledge report" heading with counts on green, then a hairline-ruled two-column wall of finding labels that scrolls; Re-check button in the heading row.

FORM: Provenance Label (museum wall labels and provenance records), position 4 of 7 on the ordered list; seed:9b801bc11b208f37.

Signature move: the provenance chain inside each label: source-of-truth rows first, then the page rows, with the changed value shown in place as old struck → new.

Raises: hairline-packed labels (from High-Density Modules); state by mark shape (from Labanotation); one colour one job (from Terminal Yellow); change shown in place (from Split-Flap).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
