# has-searched-declapract-repo (r2)

🍵 taking a slow, patient review. questioning the search evidence.

## the question

> did we search declapract-typescript-ehmpathy via gh cli for the exact practice?

this requires verifying that we actually searched the upstream repo and found concrete evidence.

---

## examining the evidence chain

### step 1: what search was performed?

from my prior work, I ran:

```
gh search code "report slow tests" --repo ehmpathy/declapract-typescript-ehmpathy --limit 5
```

this search targeted the exact error message we saw in our CI failure. "report slow tests" is the step name that was failing.

### step 2: what did the search return?

the search found matches in:
- src/practices/cicd-common/best-practice/.github/workflows/.test.yml

this is the correct file - it is the practice template that gets applied to repos during declapract upgrades.

### step 3: did we inspect the actual code?

yes. I used `rhx git.repo.get` to retrieve lines 190-340 from the upstream file. the relevant sections were:

**integration test shard (lines 238-249):**
- extracts `.perfStats.runtime` from jest json output
- performs bash arithmetic: `$((runtime / 1000))`
- no null coalesce in jq expression
- no guard for empty/null runtime values

**acceptance test shard (lines 307-318):**
- identical pattern to integration
- same vulnerability to null runtime

### step 4: does this match our defect?

yes. our CI failed because:
1. jest output contained null `.perfStats.runtime` for some tests
2. jq extracted raw `null` without coalesce
3. bash arithmetic `$((null / 1000))` failed under `set -eu`
4. step exited with code 1 despite tests passing

the upstream code has no protection against this scenario.

---

## questioning assumptions

### did I actually see the upstream code?

yes. the code inspection showed:
- `jq -r ".testResults[$i].perfStats.runtime"` - no `// 0` coalesce
- `if (( runtime > threshold )); then` - assumes numeric value
- no `[[ -z "$runtime" ]]` guard

### could this be a different version?

possible, but unlikely. I searched origin/main which is the current default branch. the practice would have been fixed if someone had already addressed this.

### is there any other explanation?

the defect could theoretically be in our local override, but:
- we applied the practice fresh during this upgrade
- the error pattern matches exactly what the upstream code would produce
- no local modifications to the report slow tests logic

---

## verification summary

| evidence | present | verified |
|----------|---------|----------|
| search command executed | yes | gh search code with exact repo |
| search returned results | yes | found .test.yml in correct path |
| file contents inspected | yes | lines 238-249 and 307-318 |
| defect pattern confirmed | yes | no null handling in upstream |
| root cause matches | yes | bash arithmetic on null |

---

## why it holds

the search was thorough:

1. **correct tool**: used gh cli which queries github api directly
2. **correct repo**: ehmpathy/declapract-typescript-ehmpathy (the practice source)
3. **correct query**: "report slow tests" matches the failing step name
4. **correct file**: located in practices/cicd-common which is the shared ci practice
5. **code inspection**: retrieved and examined the actual source lines
6. **pattern match**: upstream code has no null protection, matching our failure

the practice bug classification is grounded in concrete evidence from the upstream repository. the search was not superficial - it traced from search results to file contents to specific line numbers.