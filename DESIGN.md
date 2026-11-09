---
name: TruthLayer
description: Docs CI for AI assistants. Every fact wears a provenance label.
colors:
  wall: "#1e3a36"
  wall-raised: "#254641"
  wall-line: "#35574f"
  on-wall: "#eef2ee"
  on-wall-muted: "#a9c2ba"
  label: "#f7f7f3"
  ink: "#152320"
  ink-muted: "#4d5d58"
  rule: "#dcded6"
  brass: "#84651f"
  brass-mark: "#b08a3e"
  vermilion: "#b3321b"
  vermilion-mark: "#c43c23"
  vermilion-wash: "#fbebe6"
  dispute: "#3c4b47"
  focus: "#e2c77d"
  wall-dark: "#132622"
  wall-raised-dark: "#1a312c"
  wall-line-dark: "#2a453f"
  on-wall-dark: "#e6ede8"
  on-wall-muted-dark: "#93ada5"
  label-dark: "#1b2c28"
  ink-dark: "#e6ede8"
  ink-muted-dark: "#a2b5ae"
  rule-dark: "#2d433d"
  brass-dark: "#d6b66d"
  brass-mark-dark: "#c9a557"
  vermilion-dark: "#ff8f75"
  vermilion-mark-dark: "#f0694d"
  vermilion-wash-dark: "#3a211b"
  dispute-dark: "#c9d4cf"
  widget-bg: "#fbfbf8"
  widget-raised: "#ffffff"
  widget-muted: "#55645f"
  widget-rule: "#e0e2da"
  widget-warn: "#a62f19"
  widget-warn-rule: "#f1c7bb"
  widget-bg-dark: "#17231f"
  widget-raised-dark: "#1d2b27"
  widget-warn-dark: "#ff9b83"
  widget-warn-rule-dark: "#5c3227"
typography:
  headline:
    fontFamily: "Segoe UI Variable Text, Segoe UI, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 620
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Segoe UI Variable Text, Segoe UI, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15.5px"
    fontWeight: 620
    lineHeight: 1.35
  brand:
    fontFamily: "Segoe UI Variable Text, Segoe UI, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    letterSpacing: "0.005em"
  body:
    fontFamily: "Segoe UI Variable Text, Segoe UI, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Segoe UI Variable Text, Segoe UI, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Segoe UI Variable Text, Segoe UI, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, Cascadia Mono, SF Mono, Menlo, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  square: "2px"
  floating: "4px"
  dot: "50%"
spacing:
  hairline: "1px"
  xs: "8px"
  sm: "10px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  header: "56px"
components:
  finding-label:
    backgroundColor: "{colors.label}"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "16px 18px 14px"
  button-recheck:
    backgroundColor: "{colors.wall-raised}"
    textColor: "{colors.on-wall}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "32px"
  filter-tab:
    textColor: "{colors.on-wall-muted}"
    typography: "{typography.body}"
    padding: "8px 12px 10px"
  filter-tab-selected:
    textColor: "{colors.on-wall}"
  widget-send:
    backgroundColor: "{colors.wall}"
    textColor: "#ffffff"
    rounded: "{rounded.square}"
    padding: "0 14px"
    height: "42px"
  widget-input:
    backgroundColor: "{colors.widget-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "9px 12px"
    height: "42px"
  widget-cite:
    backgroundColor: "{colors.wall}"
    textColor: "#ffffff"
    rounded: "{rounded.square}"
    height: "18px"
    padding: "0 4px"
  widget-user-message:
    backgroundColor: "{colors.wall}"
    textColor: "#ffffff"
    rounded: "{rounded.square}"
    padding: "9px 13px"
  widget-launcher:
    backgroundColor: "{colors.wall}"
    textColor: "#ffffff"
    rounded: "{rounded.floating}"
    size: "54px"
  widget-warn-note:
    backgroundColor: "{colors.vermilion-wash}"
    textColor: "{colors.widget-warn}"
    rounded: "{rounded.square}"
    padding: "9px 11px"
---

# Design System: TruthLayer

## Overview

**Creative North Star: "The Provenance Label"**

TruthLayer is a museum wall of facts. A deep gallery-green wall carries the header, the chat column and the report heading; every finding and every cited source hangs on it as flat white label stock, square-cornered and packed edge to edge with hairline rules. Each label reads like a provenance record: what the fact says, where it came from (file:line), how old it is, and whether its attribution still holds.

Colour does one job per hue. Brass means "source of truth" and nothing else; vermilion means "outdated value" and nothing else; ink grey carries disputed facts. State is encoded twice, by colour and by mark shape, so it survives colour blindness and greyscale. The system is dense and operational: the playground sits next to an editor while a team fixes docs, so labels are compact, rules are 1px, and motion is a single short settle.

The widget is the same world folded into a shadow DOM: the label-stock panel, the square corners, the brass truth dot and the provenance-style source rows travel with it, while its header, user bubbles, citation chips and send button take the host's `accent` (default: the wall green) so it feels native on any site, light or dark.

**Key Characteristics:**
- Gallery-green wall, white label stock, 1px hairline rules between labels instead of gaps or shadows.
- Square 2px corners everywhere; 4px only on floating widget chrome.
- One colour, one job: brass = truth, vermilion = outdated, ink grey = disputed.
- State by mark shape: solid dot, struck ring, half-filled ring, barred ring, plain ring.
- Change shown in place: old value struck through, arrow, new value in bold.
- Tabular monospace only for file:line, values, counts and dates.
- System font stack only; no web fonts, no external requests.

## Colors

A cool, dark green wall with warm paper labels and two meaningful accents that never trade roles.

### Primary
- **Gallery Wall Green** (`wall`): the page background, header and report heading. Also the widget's default accent (header, user messages, citation chips, send button, launcher). In the playground the inline widget's accent is set to `wall-raised` so its header sits one step above the wall.
- **Raised Wall** (`wall-raised`): secondary buttons on the wall (Re-check) and the inline chat header.
- **Wall Line** (`wall-line`): hairlines on the wall: header bottom, column divider, filter-row rule, and the 1px gutters between labels in the grid.

### Secondary
- **Provenance Brass** (`brass`): text of source-of-truth file paths and source headings on label stock. Dark mode lifts it to `brass-dark`.
- **Brass Mark** (`brass-mark`): the solid truth dot, the header seal outline, the empty-state seal, and the selected filter tab underline.

### Tertiary
- **Outdated Vermilion** (`vermilion`): outdated file paths, the struck old value, and error-severity status text. `vermilion-mark` draws the struck-ring mark. `vermilion-wash` is the tinted ground of the widget's known-problem note.

### Neutral
- **Label Stock** (`label`): the white finding labels, empty/error state cards and loading skeletons.
- **Label Ink** (`ink`): primary text on label stock; also the selection text colour.
- **Muted Ink** (`ink-muted`): summaries, roles ("· source of truth"), ages, hint arrows, info status.
- **Label Rule** (`rule`): hairlines inside a label (chain rows).
- **Disputed Ink** (`dispute`): disputed and warning status text and the half-filled / barred marks.
- **On-Wall** (`on-wall`) / **On-Wall Muted** (`on-wall-muted`): text on the green wall; muted for scan summary, AI status and unselected tabs.
- **Focus Brass** (`focus`): the 2px focus outline and text selection background in the playground.
- **Widget neutrals** (`widget-bg`, `widget-raised`, `widget-muted`, `widget-rule`): the widget's own label stock, raised inputs/code, muted text and rules, each with a `-dark` counterpart.

Dark mode follows `prefers-color-scheme` in the playground; the widget also accepts `theme="light|dark"`. Every `-dark` token above is the dark-scheme value of its unsuffixed sibling.

### Named Rules
**The One Colour, One Job Rule.** Brass marks a source of truth and vermilion marks an outdated value. Neither is used for decoration, branding, hover, or any other state.

**The Shape Carries State Rule.** Every status colour is paired with a mark shape: solid dot = truth, struck ring = outdated, half-filled ring = disputed, barred ring = other warnings, plain ring = ordinary page. Never signal state by colour alone.

**The Host Accent Rule.** Inside the widget, only chrome (header, user bubble, citation chip, send, launcher, focus ring) takes `--tl-accent`. Text on the accent is picked automatically between `#ffffff` and `ink` by contrast. Truth and warning colours never follow the host accent.

## Typography

**Display Font:** none; the system has no display tier.
**Body Font:** Segoe UI Variable Text (with Segoe UI, -apple-system, system-ui, Roboto, Helvetica Neue, Arial, sans-serif)
**Label/Mono Font:** ui-monospace (with Cascadia Mono, SF Mono, Menlo, Consolas, monospace)

**Character:** A quiet humanist system sans for reading, with a tabular monospace that behaves like the catalogue numbers on a museum label: it appears only where a value must be checked.

### Hierarchy
- **Headline** (620, 19px, -0.005em): the "Knowledge report" heading on the wall.
- **Brand** (650, 16px, 0.005em): the TruthLayer wordmark in the header.
- **Title** (620, 15.5px, 1.35): finding-label headings. The widget's empty-state greeting uses 620 at 18px / 1.3, the widget header title 620 at 15px.
- **Body** (400, 14.5px, 1.55): base text for page and widget.
- **Body small** (400, 13–13.5px): label summaries, chain rows, fix hints, widget warn notes and source headings.
- **Label** (600, 12.5px): status words on labels ("Outdated", "Disputed") and the AI status line (500 weight there).
- **Mono** (400, 11.5–12.5px, tabular numbers): file:line paths, counts, citation numbers (600, 11px), source meta lines, inline code. Truth and outdated paths go to weight 600.

### Named Rules
**The Catalogue Number Rule.** Monospace is reserved for file:line, values, counts and dates. Headings, prose and buttons stay in the sans.

## Layout

The playground is a full-height two-column grid under a 56px header: chat column `minmax(360px, 2fr)` on the left, report `minmax(0, 3fr)` on the right, split by a 1px wall line. Desktop gutters are 24px (chat column 20px 20px 20px 24px); the report wall scrolls on its own with 20px 24px 28px padding.

The findings wall is a grid of `repeat(auto-fill, minmax(380px, 1fr))` with a **1px gap** whose background is the wall line, so labels butt together like a hung set separated by hairlines. Inside a label: 16px 18px 14px padding, 10px vertical gap, chain rows 8px top/bottom on a `16px | 1fr | auto` grid (mark, path and role, age), with the quoted value spanning the last two columns.

Breakpoints: at 980px the page stacks to one column, the chat becomes 78vh (min 520px), gutters drop to 16px and the wall becomes a single column. At 560px the product name and AI model name hide, the scan summary wraps to its own line, the filter row scrolls horizontally with a right-edge fade mask, and chain ages drop under the path.

The widget panel is 410px wide by up to 640px tall in bubble mode, 20px from the right and 86px from the bottom, above a 54px launcher; under 480px it spans the viewport with 8px side margins. The message log uses 18px 16px padding and 20px between messages.

## Elevation & Depth

The playground is completely flat. Depth comes from tone (wall vs. raised wall vs. label stock) and from 1px hairlines; no element on the wall casts a shadow. Only the floating widget, which must lift off an unknown host page, uses shadow.

### Shadow Vocabulary
- **Floating lift** (`box-shadow: 0 18px 48px rgba(15, 25, 22, 0.22), 0 3px 10px rgba(15, 25, 22, 0.10)`; dark: `0 18px 48px rgba(0, 0, 0, 0.55)`): widget launcher and bubble panel only.

### Named Rules
**The Hung-Flat Rule.** Labels on the wall never get shadows or gaps; they are separated by 1px wall-line gutters. Shadow exists only on widget chrome that floats over a host site.

## Shapes

Square, archival form. Nearly every corner is 2px: labels' containing grid edges, buttons, inputs, citation chips, user messages, code blocks, the seal. Finding labels themselves are unrounded rectangles inside the hairline grid. Floating widget chrome (launcher and bubble panel) uses 4px. The only circles are the 8px AI status dot and the 16px state marks. The seal (a checkmark inside a 1.5px brass square, 28px; 44px with a 2px border in the empty state) is the recurring identity form.

## Components

### Buttons
Quiet, square and functional.
- **Shape:** squared corners (2px).
- **Re-check (wall button):** raised-wall fill, on-wall text, 1px wall-line border, 32px tall, 0 12px padding, 13px text with a 16px refresh icon. Hover brightens the border to on-wall-muted; while busy the icon spins (0.8s linear).
- **Widget send:** accent fill, on-accent text, 42px tall, 0 14px padding, 600 weight 13.5px, "Ask" plus arrow icon. Disabled drops to 0.4 opacity.
- **Widget close:** 32px transparent icon button on the accent header; hover adds a 14% on-accent wash.

### Chips (suggested questions)
- **Style:** full-width text rows, no fill, separated by widget-rule hairlines, 11px 2px padding, 14px text, chevron icon right.
- **State:** hover shifts text to the accent and slides the row 6px right (0.25s). Dark mode keeps text colour on hover.

### Cards / Containers (finding label)
- **Corner Style:** none inside the grid; the grid edge carries the 1px wall-line border.
- **Background:** label stock.
- **Shadow Strategy:** none (Hung-Flat Rule).
- **Border:** hairlines only, via the grid gutter and `rule` between chain rows.
- **Internal Padding:** 16px 18px 14px.
- **Structure:** heading left, status (mark + word) right; summary in muted ink; provenance chain; fix hint with an arrow icon.

### Inputs / Fields
- **Style:** widget-raised fill, 1px widget-rule border, 2px corners, 9px 12px padding, min 42px, auto-grows to 140px.
- **Focus:** border shifts to the focus ring colour (the accent in light mode, a 40% accent/white mix in dark); caret uses the same.
- **Global focus:** 2px solid outline, 2px offset (brass `focus` on the playground, accent ring in the widget, on-accent inside the widget header).

### Navigation (filter tabs)
- **Style:** text tabs on the wall, 13.5px, with a mono count. Unselected on-wall-muted; hover on-wall.
- **Selected:** on-wall text with a 2px brass-mark underline sitting on the row's hairline.
- **Disabled:** empty groups drop to 0.45 opacity.

### Provenance Chain (signature)
The defining component. Inside each label, source-of-truth rows come first, then page rows. Each row: state mark, mono file:line (brass 600 for truth, vermilion 600 for outdated), muted role ("· source of truth", "· outdated"), right-aligned age in words, then the quoted value. An outdated row shows the change in place: the old value struck through in vermilion (1.5px line), an arrow, then the new value in 600 ink.

### Widget Source Row
The chat's compact provenance label: `14px mark | 18px mono number | heading` grid, 12.5px, hairline separated. Truth sources get the brass dot and brass heading; ordinary pages the plain ring. A mono meta line shows file:line, "source of truth" when applicable, and age. Clicking a citation chip (accent square, 18px, mono 600 11px) scrolls to its row and flashes it with a 12% accent tint for 0.9s.

### Known-Problem Note
A vermilion-washed box (1px warn-rule border, 2px corners, 9px 11px padding, 13px) with a warning-triangle icon in vermilion and body text in normal ink, placed between the answer and its sources.

### Motion
Short and settling. Labels enter with a 0.35s 6px rise on `cubic-bezier(.16, 1, .3, 1)` only on a fresh report; messages use the same 0.3s rise. Skeletons breathe between 0.55 and 0.85 opacity. All animation and transition is removed under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** separate labels with 1px `wall-line` gutters, never gaps or shadows.
- **Do** pair every status colour with its mark shape (solid dot, struck ring, half-filled ring, barred ring, plain ring).
- **Do** show a changed value in place: struck old value, arrow, bold new value.
- **Do** put file:line, counts, values and dates in tabular monospace, and nothing else.
- **Do** keep corners at 2px; use 4px only for floating widget chrome.
- **Do** let widget chrome follow `--tl-accent` and compute on-accent text by contrast.

### Don't:
- **Don't** use brass or vermilion for anything other than truth and outdated values.
- **Don't** use soft rounded cards, pill badges or an indigo accent; this world is square label stock on a green wall.
- **Don't** add shadows on the playground wall; only the floating widget lifts.
- **Don't** load web fonts or external assets; the system font stacks are the type.
- **Don't** reserve the half-filled mark for anything but disputed facts.
