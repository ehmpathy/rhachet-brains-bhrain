# 3.2.reflect.test.defects — classifications

## defect 1: ESM parse error for @anthropic-ai/claude-agent-sdk

### classification: practice bug

### reason

the declapract jest config practice does not handle:
1. pnpm's nested `.pnpm/` path structure
2. `.mjs` files in node_modules
3. ESM packages that need transformation

### citation

```sh
gh search code --repo ehmpathy/declapract-typescript-ehmpathy "transformIgnorePatterns"
```

found in: `src/practices/tests/best-practice/jest.integration.config.ts`

```typescript
transformIgnorePatterns: [
  // here's an example of how to ignore esm module transformation, when needed
  // 'node_modules/(?!(@octokit|universal-user-agent|before-after-hook)/)',
],
```

the commented example pattern doesn't work with pnpm's `.pnpm/` structure.

### suggested fix for declapract

update jest config practices to:
1. include `mjs` in moduleFileExtensions
2. add mjs transform rule
3. provide pnpm-compatible transformIgnorePatterns example
4. add extensionsToTreatAsEsm

---

## defect 2: signal mismatch (error:constraint vs error:malfunction)

### classification: repo quirk

### reason

the tests in this repo had incorrect expectations. the implementation returns `error:malfunction` for runtime errors (command failures, file not found). the tests incorrectly expected `error:constraint`.

this is not a declapract issue — the tests were written incorrectly.

---

## defect 3: xai multi-turn test timeout

### classification: repo quirk

### reason

this repo uses xAI integration tests which are inherently slower than anthropic/openai. the default 90s timeout is insufficient for multi-turn xai workflows.

this is specific to this repo's xai integration and not applicable to other repos.
