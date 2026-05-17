# Contributing

## Branching

- `main` is protected and auto-deploys to dev.
- Feature branches: `feat/short-name`
- Fixes: `fix/short-name`

## Commit style

Conventional Commits enforced (informally, MVP):

```
feat(api): add cost diff to webhook flow
fix(web): waitlist form double-submit
chore(infra): bump terraform 1.9.8
```

## PR checklist

- [ ] Tests pass (`make api-test`)
- [ ] Lint clean (`make lint`)
- [ ] DB migrations are forward-compatible (expand/contract)
- [ ] No secret in code or fixtures
- [ ] Docs updated if behavior changed

## Code style

- Python: ruff (config in `pyproject.toml`), type hints required, async-first.
- TypeScript: strict mode, prefer server components, edge runtime when possible.
- No comments explaining WHAT the code does. Only WHY when non-obvious.
- No premature abstraction.
