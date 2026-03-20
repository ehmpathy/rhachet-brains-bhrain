# self-review: has-validated-hazards

## validation results

### hazard 1: jest ESM transformation removed — UNVALIDATED

**test**: would require run of integration tests
**status**: deferred to stone 3.1.repair.test.defects
**notes**: will be validated when we run `npm run test:unit` and `npm run test:integration`

---

### hazard 2: tsconfig module lookup changed — DISPROVED ~~struck~~

**test**: `npm run test:types`
**result**: passed with no errors
**conclusion**: tsconfig change to node16 is safe. typescript accepts the new module lookup settings.

---

### hazard 3: CI secrets removed — UNVALIDATED

**test**: requires push to CI
**status**: deferred to CI run
**notes**: will be validated when we push and see if integration tests get API keys

---

### hazard 4: test shard introduced — DISPROVED ~~struck~~

**test**: reviewed `.github/actions/test-shards-setup/action.yml`
**result**: action has backwards compat:
```bash
if [[ ! -f "$config_file" ]]; then
  echo 'matrix=[{"type":"dynamic","shard":1,"total":1}]' >> $GITHUB_OUTPUT
```
**conclusion**: safe. shard config files not required.

---

### hazard 5: dpdm cycle detection added — VALIDATED (defect found)

**test**: `npm run test:lint:cycles`
**result**: FAILED with exit code 1
**cycles found**: 9 cycles, ALL in node_modules:
- domain-objects (2)
- helpful-errors (2)
- rhachet (4)
- bottleneck (1)

**root cause**: the exclude pattern `--exclude '^$'` doesn't exclude node_modules
**fix needed**: update package.json to use `--exclude 'node_modules'`

---

### hazard 6: test commands use stricter error handle — UNVALIDATED

**test**: would require run of full test suite
**status**: deferred to stone 3.1.repair.test.defects
**notes**: the `set -eu` change is standard; unlikely to cause issues

---

## summary

| hazard | status | action |
|--------|--------|--------|
| 1. jest ESM | unvalidated | test in repair phase |
| 2. tsconfig | ~~disproved~~ | safe |
| 3. CI secrets | unvalidated | test on CI |
| 4. shard setup | ~~disproved~~ | safe |
| 5. dpdm cycles | **validated defect** | fix exclude pattern |
| 6. set -eu | unvalidated | test in repair phase |

## defect to fix

hazard 5 is a real defect. the dpdm command needs `--exclude 'node_modules'` to avoid false positives from external dependencies.
