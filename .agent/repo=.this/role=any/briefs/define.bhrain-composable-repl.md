# bhrain = composable brain repl

## .what

bhrain is one composable brain repl in the rhachet-brains ecosystem.

## .why

rhachet is the source of truth. bhrain conforms.

| layer | owner | example |
|-------|-------|---------|
| BrainAtom | rhachet-brains-* packages | `claude/sonnet`, `openai/gpt4` |
| BrainRepl | bhrain (this package) | `bhrain/arch1` |
| discovery | rhachet | `genContextBrain({ choice })` |

## .the pattern

```ts
// one call — rhachet handles discovery and composition
const ctx = await genContextBrain({ choice: { repl: 'bhrain/arch1@claude/sonnet' } });
```

rhachet:
1. parses composite slug (splits on `@`)
2. discovers bhrain's repl (`bhrain/arch1`)
3. discovers the atom (`claude/sonnet`)
4. composes them together

bhrain just registers itself as a repl provider. no manual imports. no custom atom interface.

## .key insight

**bhrain does NOT define atoms.**

atoms come from rhachet-brains-anthropic, rhachet-brains-openai, etc.

bhrain provides the agentic loop (BrainArch1) that orchestrates atom calls with tool execution between steps. the atom is pluggable — any atom that conforms to rhachet's BrainAtom contract works.

## .tool use extension

when BrainAtom is extended to support tool use (tools in input, tool invocations in output), **any BrainAtom that implements the rhachet-brains contract becomes usable with this BrainRepl**.

this means:
- bhrain's agentic loop works with anthropic atoms
- bhrain's agentic loop works with openai atoms
- bhrain's agentic loop works with future atoms

one interface. many providers. zero custom plugins.

## .composability

```
rhachet-brains-anthropic  →  claude/sonnet, claude/opus, claude/haiku
rhachet-brains-openai     →  openai/gpt4, openai/gpt4o
rhachet-brains-bhrain     →  bhrain/arch1 (repl that uses any atom above)
```

composite slug `bhrain/arch1@claude/sonnet` = bhrain's arch1 repl + anthropic's sonnet atom

## .see also

- rhachet's genContextBrain for discovery
- BrainAtom for single-turn inference
- BrainRepl for agentic loops
