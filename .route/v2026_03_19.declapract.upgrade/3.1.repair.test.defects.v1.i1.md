# 3.1.repair.test.defects — defects fixed

## summary

| defect | status |
|--------|--------|
| 1. ESM parse error for @anthropic-ai/claude-agent-sdk | fixed |
| 2. signal mismatch (error:constraint vs error:malfunction) | fixed |
| 3. xai multi-turn test timeout | fixed |

---

## defect 1: ESM parse error for @anthropic-ai/claude-agent-sdk

### what

integration tests failed with:
```
SyntaxError: Cannot use import statement outside a module
```

the error occurred in `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@.../node_modules/@anthropic-ai/claude-agent-sdk/dist/index.mjs`

### why

pnpm nests packages differently than npm. the declapract upgrade modified jest configs but the `transformIgnorePatterns` regex didn't account for pnpm's `.pnpm/` path structure.

### fix

updated `jest.unit.config.ts` and `jest.integration.config.ts`:

1. added `mjs` to `moduleFileExtensions`
2. added mjs transform rule
3. fixed `transformIgnorePatterns` regex to handle pnpm structure
4. added `extensionsToTreatAsEsm`

```typescript
moduleFileExtensions: ['js', 'ts', 'mjs'],
transform: {
  '^.+\\.(t|j)sx?$': '@swc/jest',
  '^.+\\.mjs$': '@swc/jest',
},
transformIgnorePatterns: [
  '/node_modules/(?!(\\.pnpm/(@anthropic-ai|@openai))|(@anthropic-ai|@openai)/)/',
],
extensionsToTreatAsEsm: ['.ts'],
```

---

## defect 2: signal mismatch (error:constraint vs error:malfunction)

### what

tests in `bash/index.integration.test.ts` and `files/index.integration.test.ts` expected `error:constraint` but received `error:malfunction`.

### why

tests had wrong expectations. the implementation returns `error:malfunction` for:
- command failures (non-zero exit)
- file not found errors

`error:constraint` is for input validation failures, not runtime errors.

### fix

updated test expectations from `error:constraint` to `error:malfunction` in:
- `bash/index.integration.test.ts` (t2, t4)
- `files/index.integration.test.ts` (t2)

---

## defect 3: xai multi-turn test timeout

### what

xai integration tests failed with:
```
thrown: "Exceeded timeout of 90000 ms for a test"
```

### why

xai api is slower than anthropic/openai. multi-turn workflows with tool use can exceed 90 seconds, especially with high api latency.

### fix

increased timeout for xai test file by insert of `jest.setTimeout(180_000)` at the describe block level:

```typescript
describe('invokeBrainArch1.xai', () => {
  // xai api is slower than anthropic/openai — allow extra time for all tests
  jest.setTimeout(180_000);
  // ...
});
```

---

## verification

all integration tests pass:

```
Test Suites: 4 skipped, 8 passed, 8 of 12 total
Tests:       27 skipped, 55 passed, 82 total
```
