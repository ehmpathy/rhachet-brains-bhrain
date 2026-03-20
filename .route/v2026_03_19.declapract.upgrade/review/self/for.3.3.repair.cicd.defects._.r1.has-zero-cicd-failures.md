# has-zero-cicd-failures

## verification

confirmed ci is green:

```
gh run list --limit 3 --branch vlad/bump-practs

completed  success  fix(practs): bump to latest best practices   provision  vlad/bump-practs  pull_request  23336632760
completed  success  fix(practs): bump to latest best practices   review     vlad/bump-practs  pull_request  23336632724
completed  success  cont(ci): fix report slow tests step...      test       vlad/bump-practs  push          23336630828
```

all jobs passed:
- test-commits
- test-types
- test-format
- test-lint
- test-unit
- test-shards-integration (all shards)
- test-shards-acceptance (all shards)
- test-integration (union)
- test-acceptance-locally (union)

## why it holds

1. **xai-api-key secret**: properly chained through workflow_call secrets from test.yml -> .test.yml -> env vars in job steps

2. **null runtime handling**: report slow tests step now handles edge cases via:
   - jq null coalesce (`// 0`) to default null values
   - bash guard to skip empty or "null" string values

ci run: https://github.com/ehmpathy/rhachet-brains-bhrain/actions/runs/23336630828