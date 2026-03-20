# has-searched-declapract-repo (r1)

slowing down. verifying the search was performed.

## the question

> did we search declapract-typescript-ehmpathy via gh cli for the exact practice?

for practice bugs, we must cite the root cause with evidence from the upstream repo.

---

## the search performed

for defect 2 (report slow tests step fails on null runtime), I searched the upstream practice.

### search command

gh search code "report slow tests" --repo ehmpathy/declapract-typescript-ehmpathy --limit 5

### search result

found in src/practices/cicd-common/best-practice/.github/workflows/.test.yml at:
- line 238 (integration test shard)
- line 307 (acceptance test shard)

### file inspection

used rhx git.repo.get to retrieve lines 190-340 from the upstream file.

**defect confirmed**: the upstream uses .perfStats.runtime without null coalesce:
- jq outputs raw null when runtime is null
- bash arithmetic fails under set -eu
- this causes the report slow tests step to fail even when tests pass

---

## why it holds

- search was performed via gh search code
- specific file located in src/practices/cicd-common/best-practice
- line numbers cited: 238-249 (integration), 307-318 (acceptance)
- root cause verified: upstream lacks null handling

the practice bug classification is grounded in actual evidence from the upstream repository.