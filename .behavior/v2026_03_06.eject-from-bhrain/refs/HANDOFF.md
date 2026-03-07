# handoff: transform rhachet-brains-bhrain

> this repo was cloned from rhachet-brains-anthropic and needs transformation

---

## overview

this repo will become `rhachet-brains-bhrain` — the bhrain supplier of brains.

it will contain the BrainArch1 implementation (the brain.repl) that currently lives in rhachet-roles-bhrain.

---

## phase 1: rename anthropic → bhrain

rename all references from "anthropic" to "bhrain":

### package.json
- `"name": "rhachet-brains-anthropic"` → `"name": "rhachet-brains-bhrain"`
- update description

### files to rename
```bash
# find all files with "anthropic" in name
find . -name "*anthropic*" -o -name "*Anthropic*"
```

### content to replace
```bash
# use sedreplace or manual find/replace for:
# - "anthropic" → "bhrain"
# - "Anthropic" → "Bhrain"
# - package references
```

---

## phase 2: prune src/

the current src/ contains anthropic-specific atom code. remove it because BrainArch1 includes its own atoms.

```bash
# remove current src/ contents
rm -rf src/*
```

the ejection will populate src/ with:
- `src/domain.objects/BrainArch1/`
- `src/domain.operations/arch1/`
- `src/access/sdk/`
- `src/access/sdks/`
- `src/.test/`

**note:** domain.roles/brain/ and architect briefs are NOT ejected — they belong in the roles repo per blueprint decisions.

---

## phase 3: run ejection command

run the ejection command from the blueprint in rhachet-roles-bhrain:

**source:** `/home/vlad/git/ehmpathy/_worktrees/rhachet-roles-bhrain.vlad.eject-brain-arch1/.behavior/v2026_03_06.eject-brain-arch1/3.3.blueprint.v1.i1.md`

**the complete ejection command:**

```bash
#!/usr/bin/env bash
set -euo pipefail

FROM="/home/vlad/git/ehmpathy/_worktrees/rhachet-roles-bhrain.vlad.eject-brain-arch1"
INTO="$(realpath ~/git/ehmpathy/rhachet-brains-bhrain)"

echo "eject brain-arch1 from $FROM to $INTO"

# validate prerequisites
[ -d "$FROM" ] || { echo "✗ BadRequestError: FROM directory does not exist: $FROM"; exit 1; }
[ -d "$INTO" ] || { echo "✗ BadRequestError: INTO directory does not exist: $INTO"; exit 1; }
[ -d "$FROM/src/domain.objects/BrainArch1" ] || { echo "✗ BadRequestError: source files not found — already ejected?"; exit 1; }

# create destination directories
mkdir -p "$INTO/src/domain.objects"
mkdir -p "$INTO/src/domain.operations"
mkdir -p "$INTO/src/access"
mkdir -p "$INTO/src/.test"

# mv domain.objects
mv "$FROM/src/domain.objects/BrainArch1" "$INTO/src/domain.objects/BrainArch1"
echo "✓ moved domain.objects/BrainArch1"

# mv domain.operations (rename brain.replic.arch1 → arch1)
mv "$FROM/src/domain.operations/brain.replic.arch1" "$INTO/src/domain.operations/arch1"
echo "✓ moved domain.operations/brain.replic.arch1 → arch1"

# mv access/sdk
mv "$FROM/src/access/sdk" "$INTO/src/access/sdk"
echo "✓ moved access/sdk"

# mv access/sdks
mv "$FROM/src/access/sdks" "$INTO/src/access/sdks"
echo "✓ moved access/sdks"

# NOTE: architect briefs and brain role are NOT ejected — they belong in roles repo

# mv/cp test utilities
mv "$FROM/src/.test/genMockBrainArch1Context.ts" "$INTO/src/.test/genMockBrainArch1Context.ts"
echo "✓ moved genMockBrainArch1Context.ts"
cp "$FROM/src/.test/genContextLogTrail.ts" "$INTO/src/.test/genContextLogTrail.ts"
echo "✓ copied genContextLogTrail.ts (stays in both repos)"

echo ""
echo "🐢 ejection complete"
echo "   files: 68 (67 moved, 1 copied)"
echo "   from: $FROM"
echo "   into: $INTO"
```

---

## phase 4: post-ejection cleanup

after ejection:

1. **update imports** — change `@src/domain.operations/brain.replic.arch1` to `@src/domain.operations/arch1`
2. **update tsconfig path aliases** — ensure `@src` resolves correctly
3. **add deps** — add any absent deps from rhachet-roles-bhrain
4. **create index.ts** — export the public api
5. **run tests** — verify all tests pass

---

## phase 5: verify

```bash
npm run build
npm run test:types
npm run test:unit
npm run test:integration
```

---

## file inventory (68 files to receive)

| category | count |
|----------|-------|
| domain.objects/BrainArch1 | 19 |
| domain.operations/arch1 | 41 |
| access/sdk + access/sdks | 6 |
| test utilities | 2 |
| **total** | **68** |

**pruned (belong in roles repo):**
- architect briefs: 28 files
- brain role: 4 files

---

## summary

1. ✅ rename anthropic → bhrain (package.json, files, content)
2. ✅ prune src/ (remove anthropic atom code)
3. ✅ run ejection command (68 files from rhachet-roles-bhrain)
4. ✅ post-ejection cleanup (imports, deps, index.ts)
5. ✅ verify (build, tests)

🐢🌊
