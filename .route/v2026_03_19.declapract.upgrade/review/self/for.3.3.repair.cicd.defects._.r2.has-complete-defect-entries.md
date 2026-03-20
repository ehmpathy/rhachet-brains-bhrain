# has-complete-defect-entries (r2)

🍵 slowing down. taking time to truly review.

## the artifact

`3.3.repair.cicd.defects.v1.i1.md` documents two CI defects from this upgrade.

---

## defect 1: xai integration tests fail with incorrect API key

### what ✓

the defect is clearly described:
> xai integration tests failed with `400 "Incorrect API key provided: sk***gA. You can obtain an API key from https://console.x.ai."`

this is observable and specific — the error message, the status code, and the consequence (tests fail).

### why ✓

root cause is identified:
> the test workflow was not passing the XAI_API_KEY secret to integration test jobs. the workflow had secrets for anthropic, openai, tavily, and chutes, but not xai.

this explains **why it arose from the upgrade**: the rhachet-brains-xai package was added recently, but the workflow secrets were not updated to include it.

### fix ✓

remediation is documented step by step:
1. added `xai-api-key` secret input to workflow_call declaration
2. added `XAI_API_KEY` env var to both integration test steps
3. added passthrough in test.yml

the commit reference (`cont(ci): add xai-api-key to workflow secrets`) provides traceability.

---

## defect 2: report slow tests step fails on null runtime values

### what ✓

the defect is clearly described:
> the "report slow tests" step in CI failed with exit code 1 even when tests passed.

this captures the confusing behavior — tests green, but job red.

### why ✓

root cause is identified at the technical level:
> the bash procedure used `set -eu` and performed arithmetic on `.perfStats.runtime` which could be null for some test results.

and includes the specific failure mode:
> the expression `$((null / 1000))` or `$((' / 1000))` causes bash to fail under `set -e`.

### fix ✓

remediation explains the two-layer defense:
1. jq null coalesce (`// 0`) to default null values
2. bash guard to skip empty or "null" string values

notes that fix was applied to both integration and acceptance test jobs.

---

## why it holds

both entries are complete:

| criteria | defect 1 | defect 2 |
|----------|----------|----------|
| what: observable failure | ✓ | ✓ |
| why: root cause | ✓ | ✓ |
| fix: remediation | ✓ | ✓ |
| traceability | commit ref | commit ref |

the entries also include contextual information about *why* the defect arose in the context of the upgrade (missing new secret for new package, edge case in generic CI template).

this documentation will help future upgrades identify similar patterns.