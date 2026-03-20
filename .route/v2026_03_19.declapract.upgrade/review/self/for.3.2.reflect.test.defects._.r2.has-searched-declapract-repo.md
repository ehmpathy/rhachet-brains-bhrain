# self-review r2: has-searched-declapract-repo

## verified — search citation is accurate

reviewed artifact: `3.2.reflect.test.defects.v1.i1.md`

---

## verification of cited search

### claimed search command

```sh
gh search code --repo ehmpathy/declapract-typescript-ehmpathy "transformIgnorePatterns"
```

### actual verification run

```
gh search code --repo ehmpathy/declapract-typescript-ehmpathy "transformIgnorePatterns" --limit 10
```

### results obtained

```
ehmpathy/declapract-typescript-ehmpathy:jest.unit.config.ts: transformIgnorePatterns: [
ehmpathy/declapract-typescript-ehmpathy:jest.acceptance.config.ts: transformIgnorePatterns: [
ehmpathy/declapract-typescript-ehmpathy:jest.integration.config.ts: transformIgnorePatterns: [
ehmpathy/declapract-typescript-ehmpathy:src/practices/tests/best-practice/jest.unit.config.ts: transformIgnorePatterns: [
ehmpathy/declapract-typescript-ehmpathy:src/practices/tests/best-practice/jest.acceptance.config.ts: transformIgnorePatterns: [
ehmpathy/declapract-typescript-ehmpathy:src/practices/tests/best-practice/jest.integration.config.ts: transformIgnorePatterns: [
```

### citation accuracy

| claimed | verified |
|---------|----------|
| file: `src/practices/tests/best-practice/jest.integration.config.ts` | confirmed present in search results |
| pattern: `transformIgnorePatterns` | confirmed matches |

---

## why this holds

1. the search command was executed against the correct repo (ehmpathy/declapract-typescript-ehmpathy)
2. the cited file path exists in search results
3. the practice bug affects jest configs in the best-practice folder
4. repo quirks (defects 2 and 3) correctly have no declapract search — they are repo-specific issues

---

## conclusion

the practice bug citation is verified. search results confirm the file exists at the cited location. root cause is traceable to the declapract jest config practices.
