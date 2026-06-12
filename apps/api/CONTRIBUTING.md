# Contributing

## Commit messages

- Write commit messages in **English**.
- Use [Conventional Commits](https://www.conventionalcommits.org/) aligned with this repo (examples: `feat(auth): …`, `fix(queue): …`, `chore(ci): …`).
- Keep commits **atomic**: one logical change per commit.

## Tool attribution (forbidden)

Do **not** add trailers that attribute work to AI tools or Paperclip — in **commits** or **pull request titles/descriptions** — including:

- `Co-Authored-By: Cursor` (any email variant)
- `Co-Authored-By: Paperclip` (any email variant)
- `Made-with: Cursor`

Human authors only in commit messages, PR text, and standard `Signed-off-by` if your team uses it.

## Local validation

Enable project hooks once per clone:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/commit-msg scripts/validate-attribution.sh scripts/validate-commit-msg.sh scripts/validate-pr-content.sh
```

The `commit-msg` hook runs `scripts/validate-commit-msg.sh` on every commit.

CI runs the same attribution checks on every pull request title, description, and commit in the PR (`scripts/validate-pr-content.sh` and `scripts/validate-commit-msg.sh`).

## Agents

Cursor rules under `.cursor/rules/` reinforce this policy. HUG engineering agents must not add Paperclip/Cursor co-author trailers even if a global Paperclip skill suggests otherwise.
