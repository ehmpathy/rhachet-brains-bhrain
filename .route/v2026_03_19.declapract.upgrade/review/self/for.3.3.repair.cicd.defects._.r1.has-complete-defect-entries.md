# has-complete-defect-entries

## verification

reviewed artifact `3.3.repair.cicd.defects.v1.i1.md` — both defects have complete entries:

### defect 1: xai integration tests fail with incorrect API key

| field | present | content |
|-------|---------|---------|
| what | ✓ | xai integration tests failed with 400 "Incorrect API key provided" |
| why | ✓ | workflow was not passing XAI_API_KEY secret to integration test jobs |
| fix | ✓ | added xai-api-key secret input to .test.yml and passthrough in test.yml |

### defect 2: report slow tests step fails on null runtime values

| field | present | content |
|-------|---------|---------|
| what | ✓ | "report slow tests" step failed with exit code 1 |
| why | ✓ | bash `set -eu` + arithmetic on null `.perfStats.runtime` |
| fix | ✓ | added jq null coalesce (`// 0`) and bash guard to skip invalid values |

## why it holds

both defects follow the required format:
- **what**: describes the observable failure
- **why**: identifies root cause (why it arose)
- **fix**: documents how it was addressed

commits reference the fixes:
- `cont(ci): add xai-api-key to workflow secrets`
- `cont(ci): fix report slow tests step for null runtime values`