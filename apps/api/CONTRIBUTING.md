# Contributing

## Commit messages

- Write commit messages in **English**.
- Use [Conventional Commits](https://www.conventionalcommits.org/) aligned with this repo (examples: `feat(auth): …`, `fix(queue): …`, `chore(ci): …`).
- Keep commits **atomic**: one logical change per commit.

## Tool attribution (forbidden)

Do **not** add trailers that attribute commits to AI tools or Paperclip, including:

- `Co-Authored-By: Cursor` (any email variant)
- `Co-Authored-By: Paperclip` (any email variant)
- `Made-with: Cursor`

Human authors only in the commit body and standard `Signed-off-by` if your team uses it.

## Local validation

Enable project hooks once per clone:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/commit-msg scripts/validate-commit-msg.sh
```

The `commit-msg` hook runs `scripts/validate-commit-msg.sh` on every commit.

## Agents

Cursor rules under `.cursor/rules/` reinforce this policy. HUG engineering agents must not add Paperclip/Cursor co-author trailers even if a global Paperclip skill suggests otherwise.
