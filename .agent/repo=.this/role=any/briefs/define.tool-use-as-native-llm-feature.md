# tool use is a native LLM feature

## .what

tool use (function call) is not a prompt trick. it is a dedicated capability that LLM suppliers train into their models with specialized data and dedicated API parameters.

## .why this matters

bhrain needs native tool use - not simulated tool use via prompts. this brief explains why tool use is first-class and what makes it work.

---

## part 1: how suppliers train tool use into LLMs

### the foundation: instruction tuned models

before tool use, LLMs undergo instruction tuned post-train phases. model builders accumulate large samples of conversational data, labeled via human feedback, then update models to follow instructions reliably [1][7].

### toolformer: the seminal research

the toolformer paper (meta, february 2023) demonstrated that LLMs can teach themselves to use tools [2][3]. the approach:

1. sample positions in text where API calls might help
2. insert candidate API calls and observe if they improve token prediction
3. fine-tune on calls the model deems useful

toolformer showed that LMs can use external tools via simple APIs - a calculator, Q&A system, search engines, translation, calendar - and achieve substantially improved zero-shot performance [2].

### modern tool use via fine-tune

in june 2023, openai launched the function call API [4]. the method:

1. inject large quantities of tool invocation samples into fine-tune data
2. combine with constrained decode mechanisms
3. train the model to recognize when to invoke functions

this approach was quickly adopted by anthropic, google, meta, and others [4][5].

### what the data looks like

tool use train data follows patterns like:

```
user: what's the weather in tokyo?
assistant: [tool_call: get_weather, args: {city: "tokyo"}]
tool_result: {temp: 22, condition: "sunny"}
assistant: it's 22°C and sunny in tokyo.
```

the model learns this pattern across millions of examples [1][7].

### RLHF for tool use

reinforcement learn from human feedback (RLHF) teaches models [6][8]:

- prefer tool calls when appropriate (don't hallucinate facts)
- format arguments correctly (valid JSON, correct types)
- chain tools logically (call A before B when B depends on A)
- know when NOT to call tools (answer directly when possible)

notable RLHF-trained models include openai's chatgpt, deepmind's sparrow, google's gemini, and anthropic's claude [6].

---

## part 2: dedicated API parameters

tool use has first-class API support. it is NOT text completion with clever prompts.

### anthropic messages API [9][10]

**input: tools parameter**
```ts
{
  messages: [...],
  tools: [
    {
      name: "get_weather",
      description: "get current weather for a city",
      input_schema: {
        type: "object",
        properties: {
          city: { type: "string" }
        },
        required: ["city"]
      }
    }
  ]
}
```

**output: tool_use content block (NOT text)**
```ts
{
  content: [
    {
      type: "tool_use",      // dedicated type - not "text"
      id: "toolu_01abc123",
      name: "get_weather",
      input: { city: "tokyo" }
    }
  ],
  stop_reason: "tool_use"    // dedicated stop reason
}
```

claude's advanced tool use features include programmatic tool call, where claude writes code that orchestrates multiple tools [11].

### openai chat completions API [12][13]

**input: tools parameter**
```ts
{
  messages: [...],
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string" }
          },
          required: ["city"]
        }
      }
    }
  ]
}
```

**output: tool_calls field (NOT content)**
```ts
{
  message: {
    role: "assistant",
    content: null,           // no text content
    tool_calls: [            // dedicated field
      {
        id: "call_abc123",
        type: "function",
        function: {
          name: "get_weather",
          arguments: "{\"city\":\"tokyo\"}"
        }
      }
    ]
  },
  finish_reason: "tool_calls"  // dedicated finish reason
}
```

openai's strict mode ensures function calls reliably adhere to the function schema via constrained decode [13].

### key observation

tool calls are NOT in the text content. they are separate structured fields with their own types and stop reasons.

---

## part 3: constrained decode for reliable output

### what is constrained decode?

constrained decode manipulates a model's token generation to constrain predictions to only tokens that do not violate the required output structure [14][15].

### how it works

1. compile JSON schema into a grammar
2. at each generation step, mask tokens that would violate the grammar
3. model can only select valid next tokens

this ensures 100% compliance even for complex constraints [14].

### provider support

- openai: strict mode for function call [13]
- anthropic: constrained decode for claude (GA november 2025) [16]
- nvidia nim: structured generation [17]
- open source: guidance, outlines, llama.cpp, xgrammar [15]

### why it matters for tool use

without constrained decode:
- model might output invalid JSON
- arguments might not match schema
- required fields might be missing

with constrained decode:
- guaranteed valid structure
- type-safe arguments
- no parse failures

---

## part 4: ReAct and agentic tool use

### the ReAct framework

ReAct (Reason + Act) is a paradigm where LLMs generate reasoning traces and actions in an interleaved manner [18][19][20].

the loop:
```
Thought → Action → Observation → Thought → Action → ...
```

### how ReAct uses tools

ReAct prompts LLMs to [18]:
1. **think**: generate verbal reasoning about what to do next
2. **act**: call a tool (search, calculator, API)
3. **observe**: incorporate tool results into context
4. repeat until solution

### why ReAct beats chain-of-thought

on question answer (HotpotQA) and fact verification (Fever), ReAct overcomes hallucination and error propagation by interacting with external APIs [18][19].

key benefit: ReAct generates human-interpretable trajectories that show the agent's reasoning [18].

---

## part 5: benchmarks and evaluation

### berkeley function call leaderboard (BFCL)

BFCL is the de facto standard for function call evaluation [21][22][23].

**what it tests:**
- serial function calls (one at a time)
- parallel function calls (multiple in one turn)
- multi-turn conversations
- multi-step agentic scenarios

**evaluation method:**
- abstract syntax tree (AST) comparison
- scales to thousands of functions
- expert-curated and user-contributed test cases

### current findings

while state-of-the-art LLMs excel at single-turn calls, memory, dynamic decision-make, and long-horizon reasoning remain open challenges [21].

leaders on tool-use benchmarks are anthropic, openai, and google [1].

---

## part 6: why prompt-based tool use fails

you could try to simulate tool use via prompts:

```
when you need to call a tool, output JSON like:
{"tool": "get_weather", "args": {"city": "tokyo"}}
```

### problems

| issue | prompt-based | native tool use |
|-------|--------------|-----------------|
| JSON validity | hope | constrained decode guarantees |
| stop behavior | model keeps generate after "tool call" | dedicated stop_reason |
| parse ambiguity | is this JSON a tool call or text about JSON? | separate content type |
| schema enforce | model might hallucinate arguments | strict mode validates |
| train data | none | millions of examples |

native tool use solves all of these.

---

## part 7: implication for rhachet

rhachet's BrainAtom must pass tools to the native API:

```ts
// rhachet must do this internally
anthropic.messages.create({
  tools: plugs.tools,  // pass to native API
  ...
})

// NOT serialize tools into the prompt
// the supplier's native tool use train is what makes agentic loops reliable
```

### what bhrain needs

| requirement | why |
|-------------|-----|
| `plugs.tools` input | pass tool definitions to native API |
| `calls.tools` output | receive structured tool invocations |
| episode continuation | handle multi-turn tool flow |

---

## summary

| aspect | native tool use | prompt simulation |
|--------|-----------------|-------------------|
| specialized train | yes - fine-tune on millions of examples | none |
| output format | structured fields with dedicated types | text to parse |
| schema enforce | constrained decode | hope |
| stop behavior | dedicated stop_reason | model keeps generate |
| reliability | high (benchmarked on BFCL) | fragile |
| provider support | anthropic, openai, google, meta | n/a |

**tool use is a first-class LLM capability, not a prompt trick.**

---

## sources

1. [How LLMs are Trained for Function Call](https://simplicityissota.substack.com/p/how-llms-are-trained-for-function) - Simplicity is Sota
2. [Toolformer: Language Models Can Teach Themselves to Use Tools](https://arxiv.org/abs/2302.04761) - Meta AI Research
3. [Toolformer Paper (PDF)](https://arxiv.org/pdf/2302.04761) - arXiv
4. [Tool Call in AI Agents 2026](https://www.techjunkgigs.com/tool-calling-in-ai-agents-how-llms-execute-real-world-actions-in-2026/) - TechJunkGigs
5. [Function Call and Tool Use](https://dev.to/qvfagundes/function-calling-and-tool-use-turning-llms-into-action-taking-agents-30ca) - DEV Community
6. [RLHF - Reinforcement Learn from Human Feedback](https://en.wikipedia.org/wiki/Reinforcement_learning_from_human_feedback) - Wikipedia
7. [Tool Use & Function Call](https://rlhfbook.com/c/13-tools) - RLHF Book
8. [Illustrate RLHF](https://huggingface.co/blog/rlhf) - Hugging Face
9. [Claude Tool Use - How to Implement](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) - Anthropic
10. [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - Anthropic
11. [Advanced Tool Use on Claude](https://www.anthropic.com/engineering/advanced-tool-use) - Anthropic Engineering
12. [OpenAI Function Call](https://platform.openai.com/docs/guides/function-calling) - OpenAI
13. [OpenAI Fine-Tune for Function Call](https://cookbook.openai.com/examples/fine_tuning_for_function_calling) - OpenAI Cookbook
14. [Constrained Decode Guide](https://www.aidancooper.co.uk/constrained-decoding/) - Aidan Cooper
15. [Structured Output in LLMs: JSON Schema and Grammar-Based Decode](https://medium.com/@emrekaratas-ai/structured-output-generation-in-llms-json-schema-and-grammar-based-decoding-6a5c58b698a6) - Medium
16. [Anthropic Structured Outputs GA](https://ainativedev.io/news/anthropic-brings-structured-outputs-to-claude-developer-platform-making-api-responses-more-reliable) - AI Native Dev
17. [NVIDIA NIM Structured Generation](https://docs.nvidia.com/nim/large-language-models/latest/structured-generation.html) - NVIDIA
18. [ReAct Prompting](https://www.promptingguide.ai/techniques/react) - Prompt Engineering Guide
19. [ReAct: Synergize Reasoning and Act](https://react-lm.github.io/) - ReAct Project
20. [ReAct Paper](https://arxiv.org/abs/2210.03629) - arXiv
21. [Berkeley Function Call Leaderboard V4](https://gorilla.cs.berkeley.edu/leaderboard.html) - UC Berkeley
22. [BFCL: From Tool Use to Agentic Evaluation](https://openreview.net/forum?id=2GmDdhBdDk) - OpenReview
23. [BFCL V3: Multi-Turn Function Call](https://gorilla.cs.berkeley.edu/blogs/13_bfcl_v3_multi_turn.html) - UC Berkeley

