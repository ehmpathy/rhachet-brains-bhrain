# brain.replic.arch1

brain.repl implementation following claude-code's architecture pattern

## overview

this module implements a provider-agnostic brain.repl that:
- generates responses via pluggable brain.atoms (anthropic, openai, qwen)
- executes tool calls with permission checking
- iterates until natural completion or max iterations

## usage

```typescript
import { invokeBrainArch1 } from './core/invokeBrainArch1';
import { BrainArch1Atom } from '../../domain.objects/BrainArch1/BrainArch1Atom';

const config = {
  atom: new BrainArch1Atom({ provider: 'anthropic', model: 'claude-3-5-sonnet-latest' }),
  toolboxes: [toolboxFiles, toolboxBash],
  memoryManager: null,
  permissionGuard: null,
  maxIterations: 100,
  maxTokens: 8192,
  systemPrompt: null,
};

const result = await invokeBrainArch1(
  { config, userInput: 'read the file at /tmp/test.txt' },
  context,
);

console.log(result.finalResponse);
```

## architecture

```
core/
  invokeBrainArch1.ts       # main entry point

loop/
  runBrainArch1Loop.ts      # orchestrates iteration cycle
  iterateBrainArch1Loop.ts  # single iteration: generate → tools → append

llm/
  generateBrainArch1LlmResponse.ts  # provider routing

tool/
  executeBrainArch1ToolCall.ts  # tool execution with permissions
  mergeBrainArch1Toolboxes.ts   # toolbox merging
```

## termination

the loop terminates when:
- `NATURAL_COMPLETION`: llm responds without tool calls
- `MAX_ITERATIONS`: iteration limit reached
- `ERROR`: unrecoverable error occurred
