# has-complete-defect-coverage (r1)

🍵 slowing down. truly reviewing the coverage.

## the question

> are all defects from 3.3.repair.cicd.defects covered?

this requires me to verify that every defect documented in stone 3.3 has a corresponding classification and analysis in stone 3.4.

---

## cross-referencing the artifacts

### stone 3.3 defects (from 3.3.repair.cicd.defects.v1.i1.md)

1. **xai integration tests fail with incorrect API key**
   - what: 400 error with "Incorrect API key provided"
   - why: XAI_API_KEY secret missing from workflow chain
   - fix: added secret to workflow_call and passthrough

2. **report slow tests step fails on null runtime values**
   - what: step fails with exit code 1 despite tests passing
   - why: bash arithmetic on null .perfStats.runtime under set -eu
   - fix: jq null coalesce + bash guard

### stone 3.4 classifications (from 3.4.reflect.cicd.defects.v1.i1.md)

1. **defect 1** → classified as **repo quirk**
   - analysis: specific to this repo using rhachet-brains-xai
   - action: none (repo-specific configuration)

2. **defect 2** → classified as **practice bug**
   - analysis: upstream declapract practice lacks null handling
   - citation: ehmpathy/declapract-typescript-ehmpathy lines 238-249, 307-318
   - action: upstream pr recommended

---

## coverage verification

| defect from 3.3 | present in 3.4? | classification? | analysis? | action? |
|-----------------|-----------------|-----------------|-----------|---------|
| xai api key | ✓ | ✓ repo quirk | ✓ | ✓ none |
| null runtime | ✓ | ✓ practice bug | ✓ | ✓ upstream pr |

both defects are covered. no gaps.

---

## why it holds

the reflection artifact addresses every defect:
- **no omissions**: 2 defects in 3.3, 2 classifications in 3.4
- **clear taxonomy**: each defect is classified as either repo quirk, practice bug, or adoption candidate
- **root cause preserved**: the "why" from 3.3 flows into the analysis in 3.4
- **actionable next steps**: repo quirk → no action; practice bug → upstream pr

the classification correctly distinguishes:
- repo-specific issues (xai secret needed for this repo dependencies)
- systemic issues (practice template lacks null handling for all adopters)