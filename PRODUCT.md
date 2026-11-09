# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Docs and dev teams** at SaaS and API companies (developers, technical writers, devrel) who keep docs in git. They try TruthLayer locally in the playground (`truthlayer dev`), judge it in a few minutes, then add it to CI.
- **Their end customers**, who ask questions in the `<truthlayer-chat>` widget embedded on the product's own website. The widget must feel at home on any site, light or dark, with any accent color.

## Product Purpose

TruthLayer is "docs CI for AI assistants". It finds facts in product docs that are outdated (they disagree with the OpenAPI spec or the newest changelog entry) or conflicting (two pages disagree), and it powers a chat assistant that answers only from the docs, cites every source, shows how old each source is, and warns when a source is known to be outdated. Success: teams trust the report enough to fix their docs, and customers get answers they can check.

## Positioning

Most "chat with your docs" tools trust the docs blindly. TruthLayer treats the OpenAPI spec and changelog as the source of truth, checks the docs against them with reliable pattern rules (not AI guessing), and surfaces known problems inside the chat answer itself.

## Operating Context

- Playground: local web page at `http://127.0.0.1:4141`, chat on one side, knowledge report on the other. Usually opened next to an editor while fixing docs.
- Widget: floating bubble (default) or inline panel on a customer's site; shadow DOM; attributes `endpoint`, `mode`, `title`, `accent`, `theme`.
- Demo page `/embed`: shows the bubble on a sample website.
- Also used in GitHub PR comments and the terminal (not part of this UI).

## Capabilities and Constraints

- Finding types: Outdated, Conflict, Removed endpoint, Deprecated endpoint, Unknown endpoint, Old page. Severities: error, warning, info.
- Answer modes: AI answer with citations, search-only (no key), error fallback.
- Zero build step, no framework, no external requests: plain HTML/CSS/JS served by the Node CLI. No web fonts or CDNs (works offline, privacy-friendly).
- The widget must not break host pages and must respect the host's accent color.

## Brand Commitments

- Name: TruthLayer. Tagline: "Your docs changed. Does your AI know?"
- Voice: friendly and casual, but still clear and in simple English. Honest about limits ("Answers can be wrong. Check the sources.").

## Evidence on Hand

- Example project `examples/acme-docs` with six planted problems.
- Real finding reported upstream: mintlify/docs#8358 (Node 20.17 vs 22.20).
- No customers, testimonials or benchmarks exist; do not invent them.

## Product Principles

1. Show where every claim comes from (file:line, age).
2. Truth beats docs: the spec and changelog decide.
3. Never cry wolf: fewer, reliable findings over many guesses.
4. Local-first and free.

## Accessibility & Inclusion

Keyboard-usable chat, screen-reader labels on icon buttons, reduced-motion support, readable contrast in both themes.
