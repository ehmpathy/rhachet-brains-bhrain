# rhachet-brains-bhrain

rhachet brain.repl supplier for bhrain (BrainArch1)

## what is this?

this package provides `genBrainRepl` — a BrainRepl implementation powered by BrainArch1, bhrain's agentic loop architecture.

**key insight**: this is like claude code but as a library — you get an agentic brain that can read files, run commands, and think through problems, but you control when and how it's invoked.

## install

```sh
npm install rhachet-brains-bhrain
```

**peer dependencies**: you must also install at least one brain atom supplier:
```sh
# choose your preferred provider(s)
npm install rhachet-brains-anthropic  # for claude models
npm install rhachet-brains-openai     # for openai models
```

## usage

```ts
import { genContextBrain } from 'rhachet/brains';
import { z } from 'zod';

// 1. discover repl+atom via composite slug: bhrain/arch1@$atom
const brain = await genContextBrain({ choice: 'bhrain/arch1@claude/sonnet' });

// 2. use ask() for readonly analysis
const analysis = await brain.ask({
  role: { briefs: [] },
  prompt: 'analyze this codebase and suggest improvements',
  schema: { output: z.object({ suggestions: z.array(z.string()) }) },
});
console.log(analysis.output.suggestions);

// 3. use act() for read+write actions
const result = await brain.act({
  role: { briefs: [] },
  prompt: 'fix the bug in src/utils.ts',
  schema: { output: z.object({ fixed: z.boolean(), changes: z.string() }) },
});
console.log(result.output.changes);
```

**composite slug pattern**: `$repl@$atom`
- `bhrain/arch1@claude/sonnet` — BrainArch1 with claude sonnet
- `bhrain/arch1@xai/grok` — BrainArch1 with xai grok
- `bhrain/arch1` alone is invalid — repl requires atom

## architecture

```
┌─────────────────────────────────────────────────────────┐
│ your code                                               │
│                                                         │
│   // composite slug: bhrain/arch1@claude/sonnet         │
│   const brain = await genContextBrain({                 │
│     choice: 'bhrain/arch1@claude/sonnet'                │
│   });                                                   │
│                                                         │
│   brain.ask({ prompt, schema, role });                  │
│   brain.act({ prompt, schema, role });                  │
└────────────────────────┬────────────────────────────────┘
                         │ BrainRepl interface (atom baked in)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ genBrainRepl({ slug: 'bhrain/arch1@claude/sonnet' })    │
│   ├─ parses composite slug: repl=bhrain/arch1          │
│   │                         atom=claude/sonnet          │
│   ├─ discovers atom via rhachet brain discovery        │
│   ├─ creates BrainArch1Repl with discovered atom       │
│   ├─ invokes invokeBrainArch1                          │
│   └─ transforms BrainArch1LoopResult to BrainOutput    │
└────────────────────────┬────────────────────────────────┘
                         │ internal implementation
                         ▼
┌─────────────────────────────────────────────────────────┐
│ invokeBrainArch1({ repl, userInput })                   │
│   ├─ validates input                                    │
│   ├─ merges toolboxes (read-only or read+write)        │
│   ├─ runs agentic loop                                 │
│   │     └─ calls repl.atom.ask() for LLM inference     │
│   └─ returns BrainArch1LoopResult                      │
└─────────────────────────────────────────────────────────┘
                         │
                         │ BrainAtom (baked in from composite slug)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ rhachet-brains-anthropic / rhachet-brains-openai / ...  │
│   genBrainAtom({ slug }) → BrainAtom                    │
└─────────────────────────────────────────────────────────┘
```

**key design decisions**:

1. **composite slug pattern** — `bhrain/arch1@claude/sonnet` bakes atom into repl
2. **BrainRepl wraps BrainArch1** — consumers use the rhachet `BrainRepl` interface; BrainArch1 is internal
3. **peer dependency pattern** — no direct dependencies on brain suppliers; atom comes from peer
4. **BrainArch1Repl uses BrainAtom directly** — no adapter needed; atoms from any supplier work

## concepts

### brain.atom vs brain.repl

| interface | purpose | api |
|-----------|---------|-----|
| brain.atom | raw model access, single inference call | Messages API |
| brain.repl | agentic loop with tool use and sandbox | BrainArch1 |

> "repls are built on top of atoms... the repl is not a different model — it's an orchestration layer"

### ask vs act

| method | tools | use case |
|--------|-------|----------|
| `ask()` | readonly (Read, Glob, Grep) | analysis without side effects |
| `act()` | read+write (Read, Edit, Write, Bash) | make changes to the codebase |

## available repls

| slug pattern | description |
| --- | --- |
| `bhrain/arch1@$atom` | bhrain's agentic loop with tool use |

examples:
- `bhrain/arch1@claude/sonnet` — with claude sonnet
- `bhrain/arch1@claude/opus` — with claude opus
- `bhrain/arch1@xai/grok` — with xai grok

## create your own brain repl

want to build your own brain.repl implementation? here's how BrainArch1 works:

### BrainArch1Repl interface

```ts
interface BrainArch1Repl {
  atom: BrainAtom;                   // any rhachet BrainAtom
  role: { systemPrompt: string | null };
  constraints: { maxIterations: number; maxTokens: number };
  toolboxes: BrainArch1Toolbox[];
  memory: BrainArch1MemoryManager | null;
  permission: BrainArch1PermissionGuard | null;
}
```

### the agentic loop

```
user input
    ↓
┌─────────────────────────────────┐
│ invokeBrainArch1                │
│   ├─ validate input             │
│   ├─ merge toolboxes            │
│   └─ runBrainArch1Loop ─────────┼──┐
└─────────────────────────────────┘  │
                                     │
    ┌────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ loop iteration                  │
│   ├─ atom.ask() → response      │
│   ├─ if no tool calls → done    │
│   ├─ process tool calls         │
│   │   ├─ check permission guard │
│   │   └─ execute tool           │
│   └─ continue loop              │
└─────────────────────────────────┘
    ↓
BrainArch1LoopResult
```

### reference briefs

see `.agent/repo=.this/role=any/briefs/` for detailed documentation:

- `define.brain-atom-vs-repl.md` — atom vs repl concepts
- `define.brain-config-pattern.md` — config and slug patterns
- `define.episode-continuation-limits.md` — continuation support matrix

## sources

- [rhachet documentation](https://github.com/ehmpathy/rhachet)
- [rhachet-brains-anthropic](https://github.com/ehmpathy/rhachet-brains-anthropic) — anthropic atom supplier
- [rhachet-brains-openai](https://github.com/ehmpathy/rhachet-brains-openai) — openai atom supplier
