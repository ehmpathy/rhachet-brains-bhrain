# self-review r1: has-searched-declapract-repo

## verified — practice bugs were searched and cited

reviewed artifact: `3.2.reflect.test.defects.v1.i1.md`

---

## practice bugs in artifact

only defect 1 (ESM parse error) was classified as a practice bug.

---

## defect 1: ESM parse error — search performed

### search command used

```sh
gh search code --repo ehmpathy/declapract-typescript-ehmpathy "transformIgnorePatterns"
```

### result cited

found in: `src/practices/tests/best-practice/jest.integration.config.ts`

```typescript
transformIgnorePatterns: [
  // here's an example of how to ignore esm module transformation, when needed
  // 'node_modules/(?!(@octokit|universal-user-agent|before-after-hook)/)',
],
```

### root cause identified

the commented example pattern does not work with pnpm's `.pnpm/` nested path structure. the practice needs to be updated to support pnpm users.

---

## defects 2 and 3: not practice bugs

classified as repo quirks — no declapract search required.

---

## conclusion

the one practice bug (defect 1) has a gh cli search citation with exact file location in declapract-typescript-ehmpathy repo. root cause is documented. ready to proceed.
