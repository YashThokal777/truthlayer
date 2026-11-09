<!-- Copy this section into your project's AGENTS.md (Codex, Cursor, and other coding agents). -->

## Docs consistency (TruthLayer)

After you change Markdown docs, the OpenAPI file, the changelog, or code that changes a rate limit, price, plan limit, size limit, timeout, required version or API endpoint:

1. Run `npx truthlayer check --base HEAD`.
2. Fix every **Outdated** finding so the page matches the OpenAPI spec or the newest changelog entry.
3. For a **Conflict**, fix the wrong page if the right value is clear from the code or spec; otherwise ask the user.
4. Replace mentions of **removed** or **deprecated** endpoints.
5. When you change a public fact, add a changelog line such as `- Increased the API rate limit from 100 to 200 requests per minute.`
6. Run the check again until it is clean.

Do not add `<!-- truthlayer-ignore -->` to hide a finding unless the user confirms the sentence is correct.
