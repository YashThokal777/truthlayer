---
name: truthlayer
description: Keep product docs consistent with the API spec and changelog. Use after changing documentation (Markdown), an OpenAPI/Swagger file, a changelog, prices, plan limits, rate limits or API endpoints, and before finishing the task.
---

# TruthLayer knowledge check

This project uses TruthLayer (`truthlayer.yml`) to find docs that are outdated or that conflict with each other.

## When to run it

Run the check after you change any of these:

- Markdown docs
- the OpenAPI / Swagger file
- the changelog
- code that changes a rate limit, price, plan limit, file size, timeout, required version, or an API endpoint

## How

```bash
npx truthlayer check --base HEAD
```

`--base HEAD` shows only problems that involve files you changed. Run `npx truthlayer check` without `--base` to see everything.

## What to do with the results

- **Outdated:** update the page so it matches the source of truth (OpenAPI spec or newest changelog entry). Change only the outdated value; keep the rest of the page.
- **Conflict:** two pages disagree. If the right value is clear from the code or the spec, fix the wrong page. If it is not clear, ask the user which value is right — do not guess.
- **Removed / deprecated endpoint:** replace it with the new endpoint, or say it is deprecated.
- **Unknown endpoint:** check for a typo or a missing endpoint in the spec, and ask the user if unsure.

If you changed a public fact (for example a rate limit), also add a changelog entry like:
`- Increased the API rate limit from 100 to 200 requests per minute.`

Run the check again until it is clean, then tell the user which pages you updated.

Never add `<!-- truthlayer-ignore -->` just to hide a finding. Only add it when the user confirms the sentence is correct.
