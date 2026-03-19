# reason vs tool use in LLMs

## .what

reason and tool use are distinct but complementary capabilities in modern LLMs:

| capability | definition | mechanism |
|------------|------------|-----------|
| **reason** | internal chain-of-thought to decompose problems into steps | generates thought tokens before/during response |
| **tool use** | external actions to augment capabilities with real-world data | calls APIs, executes code, searches knowledge bases |

## .why this distinction matters

- **cost implications**: reason tokens inflate costs even when output is short [1]
- **architectural differences**: reason is compute-at-inference; tools are I/O operations
- **error patterns**: reason suffers hallucination; tools provide external validation [2]
- **when to use**: complementary strategies, not competitors [3]

---

## part 1: how anthropic distinguishes reason vs tool use

### extended thought (reason)

claude's extended thought enables the model to "think" internally before response, produces internal chain-of-thought tokens that improve complex problem solve [4][5][6].

key properties:
- generates reason tokens (billed as output tokens)
- interleaved thought allows reason between tool calls [4]
- adaptive effort levels: low, medium, high, max [7]

### the "think" tool (hybrid)

anthropic introduced a dedicated "think" tool that lets claude pause and reason in agentic workflows [8]:

> "the reason claude performs with the think tool is less comprehensive than extended thought, but better suited for complex tool chains where each step builds on previous ones."

**when to use extended thought vs think tool:**

| use case | recommended |
|----------|-------------|
| simple tool calls, non-sequential | extended thought |
| complex multi-step tool chains | think tool |
| policy-heavy environments | think tool |
| sequential decisions where mistakes are costly | think tool |

### tool use in claude

claude's tool use is a native capability trained via fine-tune and RLHF [9]:

```ts
// tool definition → native API parameter
tools: [{ name: "get_weather", input_schema: {...} }]

// tool invocation → separate content type (NOT text)
{ type: "tool_use", id: "toolu_01abc", name: "get_weather", input: {...} }
```

key insight: tool calls are **NOT text completions with clever prompts**. they use dedicated API fields, constrained decode, and specialized train data [9].

---

## part 2: how openai distinguishes reason vs tool use

### reason models (o1, o3, o4-mini)

openai's o-series models are trained with reinforcement learn to reason internally before response [10][11]:

> "reason models think before they answer, produce a long internal chain of thought before response to the user."

**reason effort parameter:**

| level | behavior | budget_tokens ratio |
|-------|----------|---------------------|
| minimal | fastest, least tokens | 0.1 |
| low | speed-optimized | 0.2 |
| medium | balanced (default) | 0.5 |
| high | thorough reason | 0.8 |
| xhigh | maximum quality | 0.95 |

reason tokens are hidden from API responses but billed as output tokens, with caps at 128K tokens max [12][13].

### function call (tool use)

openai's function call is a separate trained capability [14][15]:

> "both [o3 and o4-mini] were trained to use tools through reinforcement learn—teach them not just how to use tools, but to reason about when to use them."

**key difference from earlier models:**

- o3/o4-mini: reason items adjacent to function calls are included in context
- earlier o1: reason items were always ignored in follow-up requests [14]

### combined reason + tools

for the first time with GPT-5 and o-series, reason models can agentically combine tools in extended thought—search the web, analyze files, generate images—all while reason [10].

---

## part 3: how xai distinguishes reason vs tool use

### grok reason capabilities

grok 4 uses reinforcement learn for reason at pretrain scale [16]:

> "grok's reason capabilities allow it to think for seconds to minutes, correct errors, explore alternatives, and deliver accurate answers."

benchmark achievements:
- 15.9% on ARC-AGI V2 (state-of-the-art for closed models)
- 61.9% on USAMO'25 (first place)
- 50.7% on Humanity's Last Exam (first to exceed 50%)

### grok tool use

grok 4 was trained via RL to use tools that include code interpreters and web browse [17]:

> "grok 4.1 Fast is an optimized variant aimed at tool-call and agentic workflows that supports a 2-million-token context window and an Agent Tools API."

key insight: grok 4 fast reduces average thought tokens by 40% vs grok 4, yields ~98% cost decrease for equivalent benchmark performance [18].

### interleaved reason + tool use

kimi K2 (moonshot AI) demonstrates the pattern of interleaved reason and tool use [19]:

> "rather than complete all reason steps before action, Kimi K2 executes cycles of reason and tool use, enables it to adjust continually based on interim reason steps or results of tool calls."

trade-off: Kimi K2 used 140 million tokens for evaluations—2.5x more than competitors [19].

---

## part 4: academic research on reason vs tool use

### chain-of-thought prompts (Wei et al., 2022)

the foundational paper on CoT reason [20][21]:

> "chain of thought prompts improve performance on arithmetic, commonsense, and symbolic reason tasks... these benefits are an emergent property of model scale (~100B parameters)."

key find: CoT helps primarily on math and symbolic reason, with smaller gains on other task types [22].

### ReAct: synergize reason and act (Yao et al., 2023)

the seminal paper that combines reason traces with tool actions [23][24][25]:

> "reason traces help the model induce, track, and update action plans as well as handle exceptions, while actions allow it to interface with external sources to gather additional information."

results:
- HotpotQA and Fever: overcomes hallucination via Wikipedia API interaction
- ALFWorld: +34% absolute success rate over imitation learn
- WebShop: +10% over reinforcement learn baselines

### Toolformer (Schick et al., 2023)

meta's research on self-supervised tool learn [26][27]:

> "toolformer achieves substantially improved zero-shot performance across a variety of downstream tasks, often competitive with much larger models, without sacrifice of core language model abilities."

tools learned: calculator, Q&A system, search engines, translation, calendar.

### test-time compute scale

recent research shows test-time reason can outperform larger models [28][29][30]:

> "on problems where a smaller base model attains somewhat non-trivial success rates, test-time compute can be used to outperform a 14x larger model."

key find: "no single TTS strategy universally dominates" [30].

### process reward models

PRMs provide step-by-step verification for reason chains [31][32][33]:

> "process supervision can train much more reliable reward models than outcome supervision"

openai's "Let's Verify Step by Step" paper achieved 78.2% on MATH test set via process supervision [34].

### self-consistency

self-consistency samples multiple reason paths and selects the most consistent answer [35][36]:

> "a complex reason problem typically admits multiple different ways of thought that lead to its unique correct answer."

this complements tool-augmented generation: self-consistency provides reason structure, tools provide ground [37].

---

## part 5: key distinctions summarized

### architectural differences

| aspect | reason | tool use |
|--------|--------|----------|
| location | internal to model | external I/O |
| tokens | reason tokens (hidden, billed) | tool call tokens (visible) |
| train | RL for CoT generation | RL for when/how to call |
| validation | self-consistency, PRMs | external verification |
| latency | compute-bound | I/O-bound |

### cost implications

| token type | nature | bill |
|------------|--------|------|
| input | parallel process (one forward pass) | lowest |
| output | sequential generation (autoregressive) | higher |
| reason | internal thought (hidden) | billed as output |
| tool call | external action | counted in context |

reason-heavy tasks can cost 5-10x more than standard completions [1].

### when to use each

| scenario | approach |
|----------|----------|
| math, symbolic reason | reason (CoT) |
| factual lookup, verification | tool use |
| multi-step with external data | ReAct (interleaved) |
| complex decision chains | think tool + extended thought |
| cost-sensitive applications | lower reason effort |

### the complementary pattern

modern frontier models combine both [3]:

> "reason LLMs use chain-of-thought (CoT), tools (e.g., ReAct), and planner–executor–verifier loops to solve harder problems with higher accuracy—but at the cost of latency, tokens, and dollars."

---

## part 6: context flow and exposure

### do reason tokens flow into context?

**yes, but discarded between turns:**

| provider | flows into context? | persists across turns? |
|----------|---------------------|------------------------|
| **openai** | yes - occupies context window | **no** - discarded after turn |
| **anthropic** | yes - occupies context window | **no** - discarded after turn |
| **xai** | yes - occupies context window | varies by model |

from openai [43]:
> "after generate reason tokens, o1 produces an answer as visible completion tokens, and **discards the reason tokens from its context**. in multi-turn conversations, input/output tokens from the previous step are passed forward, but **reason tokens from the previous step are not passed to the next step**."

implications:
- reason tokens consume context window **within a single turn**
- they're **discarded** before the next turn
- you pay for them, but they don't accumulate
- the model cannot reference its prior reason in later turns

### do providers expose reason tokens?

| provider | exposed? | what you see |
|----------|----------|--------------|
| **openai** | **no** | hidden; only billed output visible |
| **anthropic** | **yes (summarized)** | summary of thought; full tokens billed |
| **xai** | **partial** | varies by model |

#### openai (o1, o3, o4-mini): fully hidden

from openai reason docs [11]:
> "reason tokens are not visible via the API, but they still occupy space in the model's context window and are billed as output tokens."

you only see:
- `reason_tokens` count in usage metrics
- the final output

#### anthropic (claude): visible but summarized

from anthropic announcement [5]:
> "we decided to make the thought process visible in raw form... actual internal reason processes, not summaries."

but with caveats from the docs [4]:
- you receive a **summary** of full thought
- you're **billed for full thought tokens**, not summary tokens
- harmful content is encrypted/redacted: "the rest of the thought process is not available for this response"

#### xai (grok): varies by model

from xAI reason docs [44]:

| model | reason visible? |
|-------|-----------------|
| grok-3-mini | yes - returns `message.reason_content` |
| grok-3 | no |
| grok-4 | encrypted only - via `include: ["reason.encrypted_content"]` |
| grok-4.1-fast | yes - transparent reason tokens |

### summary table

```
openai:    context ✓  persist ✗  expose ✗ (hidden)
anthropic: context ✓  persist ✗  expose ✓ (summarized, billed full)
xai:       context ✓  persist ?  expose ~ (model-dependent)
```

---

## part 7: external reason loops vs internal CoT

### can you loop on reason via tool use?

**yes — and research shows it's effective for different use cases than internal CoT.**

#### the fundamental difference

| approach | mechanism | ground | error correct |
|----------|-----------|--------|---------------|
| **internal CoT** | model reasons in hidden tokens | none - pure internal | self-consistency only |
| **external loop (ReAct)** | interleave reason + tool calls | external validation | observe + adjust |
| **think tool** | explicit reason step between tools | tool results | inspect + plan |

from the ReAct paper [23]:
> "with chain-of-thought, a model is not grounded in the external world and uses its own internal representations to generate reason traces, **limit its ability to reactively explore and reason or update its knowledge**."

vs ReAct:
> "actions lead to observation feedback from an external environment, reason traces affect the internal state of the model by reason over the context and **update it with useful information to support future reason and act**."

#### when each approach excels

| task type | better approach | why |
|-----------|-----------------|-----|
| math, symbolic | internal CoT | closed-world, no external data needed |
| factual QA | external loop (ReAct) | can verify via search/retrieval |
| multi-hop reason | external loop | can retrieve intermediate facts |
| policy compliance | think tool | can check rules between steps |
| code generate | either | internal for logic, external for docs/tests |

from anthropic on the think tool [8]:
> "the reason claude performs with the think tool is **less comprehensive than extended thought**, but better suited for complex tool chains where each step builds on previous ones."

#### agentic reason research (2025)

recent ACL 2025 paper on "Agentic Reason" [45]:
> "agentic reason is achieved by interleave text-based thought, tool queries, and tool outputs, enable dynamic coordination of reason, tool use, and environment interaction within a unified framework."

key innovation - the Mind-Map agent [45]:
> "constructs a structured knowledge graph to store reason context and track logical relationships, ensure coherence in long reason chains with extensive tool usage."

the pattern [46]:
> "an agentic loop is where you supply a reason LLM with a goal, provide it with tools that allow it to evaluate its progress towards that goal, then allow it to iterate until the goal is eventually met."

typical cycle: **think → act → observe → repeat**

#### effectiveness comparison

from HotpotQA and Fever benchmarks [23]:
- **ReAct outperforms vanilla action generation** while competitive with CoT
- ReAct **overcomes hallucination** via Wikipedia API interaction (CoT cannot)
- CoT mistakes in early steps propagate; ReAct can self-correct via observation

from IBM on agentic reason [47]:
> "the model generates reason in CoT but doesn't verify if each step is correct, mistakes in early steps can propagate... CoT only applies within a single prompt without allow iterative refine or external knowledge retrieval."

#### the trade-off

| aspect | internal CoT | external loop |
|--------|--------------|---------------|
| latency | lower (single pass) | higher (multi-turn) |
| tokens | reason tokens only | reason + tool + observe |
| ground | none | external sources |
| correct | self-consistency | observe and adjust |
| cost | moderate | higher (more calls) |

from Kimi K2 results [19]:
> interleaved reason + tool use used **140 million tokens** for evaluations—2.5x more than competitors

#### recommendation

use internal CoT when:
- closed-world problems (math, logic puzzles)
- no external data needed
- latency/cost sensitive

use external reason loops when:
- need factual ground
- multi-step with external data
- policy compliance matters
- mistakes are costly and need correction

use both (think tool + extended thought) when:
- complex agentic workflows
- sequential decisions build on prior
- need both deep reason and external validation

---

## part 8: how repls talk to themselves (agentic loops)

### the core pattern

repls like claude code use a **tool-driven conversation loop** where the model talks to itself via tool calls until ready for human input [50][51]:

```
human prompt
    ↓
┌─────────────────────────────────────┐
│  LOOP until stop_reason != tool_use │
│                                     │
│  1. model generates response        │
│  2. if tool_use requested:          │
│     - execute tool                  │
│     - append result to messages     │
│     - continue loop                 │
│  3. if end_turn:                    │
│     - exit loop                     │
│     - return to human               │
└─────────────────────────────────────┘
    ↓
human sees final response
```

### the mechanism: stop_reason

the API returns a `stop_reason` that controls loop continuation [52]:

| stop_reason | indicates | action |
|-------------|-----------|--------|
| `tool_use` | model wants to call a tool | execute tool, append result, **continue loop** |
| `end_turn` | model is done | **exit loop**, return to human |
| `pause_turn` | server tool needs continuation | append response, **continue loop** |
| `max_tokens` | hit limit | exit loop |

key insight: **each tool result becomes a new "user" message** that feeds back into the model — it's a multi-turn conversation where the "user" is the tool execution system [53].

### what internal messages look like

from traffic analysis of claude code [53]:

```
turn 1: human      → "fix the bug in auth.ts"
turn 2: assistant  → [tool_use: read_file, path: "auth.ts"]
turn 3: tool_result → "contents of auth.ts..."
turn 4: assistant  → [tool_use: edit_file, path: "auth.ts", ...]
turn 5: tool_result → "file edited successfully"
turn 6: assistant  → [tool_use: run_tests]
turn 7: tool_result → "3 tests passed"
turn 8: assistant  → "I fixed the bug by..." [end_turn]
        ↓
        human sees this
```

turns 2-7 are **internal** — the human only sees turns 1 and 8.

### the TAOR pattern

from architecture analysis [54]:

> "the heart of claude code behaves like a recursive, async generator-driven loop that treats each step as a fresh invocation with updated state, rather than a simple linear conversation."

**Think → Act → Observe → Repeat**

each cycle:
1. stream model response
2. pause when tool_use requested
3. run tools, collect outputs
4. re-enter loop with updated history (user + assistant + tool_result)

### why reason tokens don't persist but tool results do

critical distinction:

| content type | persists across internal turns? | persists across human turns? |
|--------------|--------------------------------|------------------------------|
| reason tokens (internal CoT) | **no** - discarded | **no** - discarded |
| tool_use requests | **yes** - in messages | **yes** - in messages |
| tool_result responses | **yes** - in messages | **yes** - in messages |
| final output | **yes** - in messages | **yes** - in messages |

this means:
- the model **can** reference prior tool results in later internal turns
- the model **cannot** reference prior reason tokens
- tool results provide persistent "memory" within the agentic loop

### implications for repl architecture

a minimal agentic repl loop:

```ts
// simplified repl loop
const runReplLoop = async (input: { prompt: string }, context: { atom: BrainAtom }) => {
  let episode: BrainEpisode | undefined;
  let currentPrompt = input.prompt;

  while (true) {
    const response = await context.atom.ask({
      prompt: currentPrompt,
      plugs: { tools: availableTools },
      on: episode ? { episode } : undefined,
    });

    // update episode for continuation
    episode = response.episode;

    // check if done
    if (!response.calls?.tools?.length) {
      // no tool calls → done, return to human
      return response.output;
    }

    // execute tools, feed results back as next "user" message
    const toolResults = await executeTools(response.calls.tools);
    currentPrompt = formatToolResults(toolResults);
  }
};
```

the repl is essentially a **while loop** that continues until the model stops request tool calls [55].

### multi-turn degradation

research shows LLMs lose performance in long internal loops [56]:

> "all top open- and closed-weight LLMs exhibit significantly lower performance in multi-turn conversations than single-turn, with an average drop of 39% across six generation tasks. when LLMs take a wrong turn in a conversation, they get lost and do not recover."

this is why repls benefit from:
- explicit think tools to force reason checkpoints
- structured tool results to maintain context clarity
- episode continuation to preserve conversation state

---

## part 9: interleaved content blocks (self-talk without tools)

### a single response can contain BOTH text AND tool_use

claude can emit multiple content blocks in one response — text and tool_use are independent [57]:

```json
{
  "content": [
    { "type": "text", "text": "Let me check that file..." },
    { "type": "tool_use", "name": "read_file", "input": {"path": "auth.ts"} }
  ],
  "stop_reason": "tool_use"
}
```

this is what you see when the model "talks to itself" before act — **no special tool required**.

### three distinct mechanisms for self-talk

| what you see | mechanism | content block type | persists? |
|--------------|-----------|-------------------|-----------|
| gray italic text above response | **extended thought** (hidden CoT made visible) | `thinking` | **no** |
| regular text before tool call | **interleaved text** | `text` | **yes** |
| tool call to "think" | **think tool** (explicit scratchpad) | `tool_use` | **yes** |

#### 1. interleaved text (most common)

```json
{
  "content": [
    { "type": "text", "text": "I'll read the file first to understand the bug." },
    { "type": "tool_use", "name": "read_file", "input": {...} }
  ]
}
```

this is **regular output** that happens to precede a tool call. no special tool needed. the text persists in conversation history.

#### 2. the "think" tool (explicit self-talk)

anthropic provides a literal "think" tool that claude can call to reason [8]:

```json
{
  "content": [
    { "type": "tool_use", "name": "think", "input": {
      "thought": "The user wants X, but I should consider Y first..."
    }}
  ]
}
```

this is **tool use for self-talk** — the tool has no side effects; it only gives claude a place to write reason that persists in context as a tool_result.

#### 3. extended thought blocks

with extended thought enabled, you get a `thinking` block type [4][57]:

```json
{
  "content": [
    { "type": "thinking", "thinking": "internal chain of thought..." },
    { "type": "text", "text": "Here's my answer..." }
  ]
}
```

this is **hidden CoT made visible** (via verbose mode / Ctrl+O in claude code [58]).

### why all three exist

| approach | persists in context? | billed as | use case |
|----------|---------------------|-----------|----------|
| extended thought | **no** - discarded between turns | output tokens | deep internal reason |
| interleaved text | **yes** - in messages array | output tokens | explain actions to human |
| think tool | **yes** - as tool_result | output tokens | persist reason across turns |

the think tool exists specifically because extended thought doesn't persist — if the model needs to remember its reason for later turns, it must write it into a tool call [8].

### when to use each

| scenario | best approach |
|----------|---------------|
| complex math/logic | extended thought (deep, discarded) |
| explain to human what you're about to do | interleaved text |
| remember reason for later in agentic loop | think tool |
| policy compliance with audit trail | think tool |
| sequential decisions that build on prior | think tool |

---

## part 10: supplier comparison — explicit think/scratchpad tools

### how each supplier exposes self-talk

| supplier | explicit think tool? | reason tokens visible? | persists in context? |
|----------|---------------------|----------------------|---------------------|
| **anthropic** | yes - "think" tool [8] | summarized [5] | yes (as tool_result) |
| **openai** | **no** - internal only | **no** - hidden [11] | **no** - discarded |
| **xai** | **no** - internal only | partial (model-dependent) [44] | **no** - discarded |

### anthropic: the "think" tool

anthropic is the only major supplier with an **explicit scratchpad tool** [8][59]:

```json
{
  "name": "think",
  "description": "Use this tool to think through complex problems step-by-step.",
  "input_schema": {
    "type": "object",
    "properties": {
      "thought": {
        "type": "string",
        "description": "Your step-by-step reason about the problem."
      }
    },
    "required": ["thought"]
  }
}
```

key properties:
- **developer-defined**: you add this tool to your tool list
- **no side effects**: the tool execution returns the thought back as tool_result
- **persists**: written reason stays in context for future turns
- **customizable**: adapt the schema and instructions for your domain

from anthropic [8]:
> "implement a 'think' tool customized to your domain. it requires minimal code but enables more structured reason."

### openai: no explicit think tool

openai does **not** expose an explicit think/scratchpad tool [11][60]:

- reason happens via **internal reason tokens** (hidden)
- you control depth via `reasoning_effort` parameter (low → xhigh)
- reason tokens are **not visible** via API
- reason tokens are **discarded** between turns

from openai [11]:
> "reason tokens are not visible via the API, but they still occupy space in the model's context window and are billed as output tokens."

**workaround**: some developers simulate a think tool by add a custom tool, but it lacks the RL-trained behavior claude has [61].

### xai: no explicit think tool

xai does **not** expose an explicit think tool [44]:

- reason happens via **internal reason tokens**
- you control depth via `reasoning_effort` parameter
- visibility varies by model:
  - grok-3-mini: `message.reasoning_content` visible
  - grok-4: encrypted only via `include: ["reasoning.encrypted_content"]`
  - grok-4.1-fast: transparent reason tokens
- reason tokens **discarded** between turns (like openai)

---

## part 11: evaluation — how much does explicit think help?

### anthropic think tool: τ-bench results

the think tool was evaluated on τ-bench (tau-bench), a benchmark for tool-agent-user interaction in customer service domains [62][63]:

| configuration | retail pass^1 | airline pass^1 |
|--------------|---------------|----------------|
| baseline (no think) | ~0.65 | ~0.45 |
| extended thought only | ~0.72 | ~0.52 |
| think tool only | **0.812** | ~0.58 |
| think tool + optimized prompt | **0.85+** | **0.70** |

key finds [8]:
- think tool achieved **highest pass^1 score (0.812)** on retail even without prompt optimization
- think tool + optimized prompts delivered **54% improvement** over baseline on airline
- think tool **outperformed extended thought** for policy-heavy agentic tasks

why think tool beats extended thought for agentic tasks:
> "the think tool is better suited for when claude needs to call complex tools, analyze tool outputs carefully in long chains of tool calls, navigate policy-heavy environments"

### openai o1/o3: reason token improvements

openai's internal reason tokens show dramatic improvements on benchmarks [64][65]:

| benchmark | o1 | o3 | improvement |
|-----------|-----|-----|-------------|
| AIME 2024 (math) | 83.3% | **96.7%** | +13.4% |
| Frontier Math | <2% (all models) | **25.2%** | first >2% |
| CodeForces | ~2000 elo | **2700+ elo** | grandmaster level |
| SWE-Bench Verified | ~50% | **69.1%** | +19% |

key insight [66]:
> "o3-mini achieves superior accuracy without require longer reason chains than o1-mini... accuracy generally declines as reason chains grow, though this drop is significantly smaller in more proficient models"

### comparison: explicit tool vs internal reason

| approach | best for | eval improvement | trade-off |
|----------|----------|------------------|-----------|
| **think tool** (anthropic) | policy compliance, multi-step agentic | +54% on τ-bench airline | requires tool definition, uses context |
| **internal reason** (openai) | math, code, single-turn | +13% AIME, +19% SWE-Bench | hidden, discarded, no audit trail |
| **internal reason** (xai) | general reason | comparable to openai | partial visibility |

### when explicit think tool wins

from anthropic research [8]:
1. **policy-heavy environments**: complex rules require explicit checkpoints
2. **sequential decisions**: each step builds on prior, mistakes are costly
3. **audit requirements**: need to inspect reason after the fact
4. **multi-turn agentic**: reason must persist across tool calls

### when internal reason tokens win

from openai research [64]:
1. **math and symbolic**: closed-world, no external data needed
2. **single-turn completion**: no need to persist reason
3. **latency-sensitive**: internal reason is faster (no tool round-trip)
4. **cost-sensitive**: no extra tokens for tool_result storage

---

## sources

1. [Why Output & Reason Tokens Inflate LLM Costs](https://www.codeant.ai/blogs/input-vs-output-vs-reasoning-tokens-cost) - CodeAnt
2. [How Reason Works in LLMs](https://ragyfied.com/articles/how-reasoning-works-in-llms) - RAGyfied
3. [State of Reason LLMs](https://medium.com/@adnanmasood/state-of-reasoning-llms-the-new-era-of-thinking-machines-f241b1a3096d) - Adnan Masood
4. [Build with Extended Thought](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) - Anthropic
5. [Claude's Extended Thought](https://www.anthropic.com/news/visible-extended-thinking) - Anthropic
6. [Extended Thought - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-extended-thinking.html) - AWS
7. [Claude Opus 4.6 Release](https://www.marktechpost.com/2026/02/05/anthropic-releases-claude-opus-4-6-with-1m-context-agentic-coding-adaptive-reasoning-controls-and-expanded-safety-tooling-capabilities/) - MarkTechPost
8. [The "think" Tool](https://www.anthropic.com/engineering/claude-think-tool) - Anthropic
9. [Tool Use - How to Implement](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) - Anthropic
10. [Introduce o3 and o4-mini](https://openai.com/index/introducing-o3-and-o4-mini/) - OpenAI
11. [Reason Models](https://platform.openai.com/docs/guides/reasoning) - OpenAI API
12. [Reason Best Practices](https://platform.openai.com/docs/guides/reasoning-best-practices) - OpenAI API
13. [Reason Tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens) - OpenRouter
14. [Handle Function Calls with Reason Models](https://cookbook.openai.com/examples/reasoning_function_calls) - OpenAI Cookbook
15. [Function Call](https://platform.openai.com/docs/guides/function-calling) - OpenAI API
16. [Grok 3 Beta](https://x.ai/news/grok-3) - xAI
17. [Grok 4](https://x.ai/news/grok-4) - xAI
18. [xAI Releases Grok 4 Fast](https://www.infoq.com/news/2025/09/xai-grok4-fast/) - InfoQ
19. [Kimi K2](https://www.deeplearning.ai/the-batch/kimi-k2-thinking-outperforms-proprietary-models-with-new-techniques-for-agentic-tool-use/) - DeepLearning.AI
20. [Chain-of-Thought Prompts Elicit Reason](https://arxiv.org/abs/2201.11903) - arXiv (Wei et al.)
21. [Language Models Perform Reason via CoT](https://research.google/blog/language-models-perform-reasoning-via-chain-of-thought/) - Google Research
22. [To CoT or not to CoT?](https://openreview.net/forum?id=w6nlcS8Kkn) - OpenReview
23. [ReAct: Synergize Reason and Act](https://arxiv.org/abs/2210.03629) - arXiv (Yao et al.)
24. [ReAct Blog Post](https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models/) - Google Research
25. [ReAct Project](https://react-lm.github.io/) - Princeton/Google
26. [Toolformer Paper](https://arxiv.org/abs/2302.04761) - arXiv (Schick et al.)
27. [Toolformer Publication](https://ai.meta.com/research/publications/toolformer-language-models-can-teach-themselves-to-use-tools/) - Meta AI
28. [Scale LLM Test-Time Compute](https://arxiv.org/abs/2408.03314) - arXiv
29. [Scale Test-Time Compute ICLR 2025](https://openreview.net/forum?id=4FWAwZtd2n) - OpenReview
30. [The Art of Scale Test-Time Compute](https://arxiv.org/abs/2512.02008) - arXiv
31. [Reward Progress: Scale Automated Process Verifiers](https://openreview.net/forum?id=A6Y7AqlzLW) - OpenReview
32. [A Visual Guide to Reason LLMs](https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-reasoning-llms) - Maarten Grootendorst
33. [Lessons of Develop Process Reward Models](https://arxiv.org/abs/2501.07301) - arXiv
34. [Let's Verify Step by Step](https://cdn.openai.com/improving-mathematical-reasoning-with-process-supervision/Lets_Verify_Step_by_Step.pdf) - OpenAI
35. [Self-Consistency](https://www.promptingguide.ai/techniques/consistency) - Prompt Engineer Guide
36. [Self-Consistency Improves CoT Reason](https://arxiv.org/abs/2203.11171) - arXiv (Wang et al.)
37. [Combine CoT and RAG](https://arxiv.org/html/2505.09031v1) - arXiv

---

## additional references

38. [Chain-of-Thought Prompts](https://www.promptingguide.ai/techniques/cot) - Prompt Engineer Guide
39. [What is Chain of Thought Prompts?](https://www.ibm.com/think/topics/chain-of-thoughts) - IBM
40. [10 AI Agent Benchmarks](https://www.evidentlyai.com/blog/ai-agent-benchmarks) - Evidently AI
41. [Test-Time Scale Survey](https://testtimescaling.github.io/) - Research Survey
42. [Grok 4.1 Fast and Agent Tools API](https://x.ai/news/grok-4-1-fast) - xAI
43. [OpenAI Reason Models Guide](https://developers.openai.com/api/docs/guides/reasoning/) - OpenAI
44. [xAI Reason Guide](https://docs.x.ai/docs/guides/reasoning) - xAI
45. [Agentic Reason: A Streamlined Framework](https://arxiv.org/abs/2502.04644) - arXiv / ACL 2025
46. [The Power of Agentic Loops](https://blog.scottlogic.com/2025/12/22/power-of-agentic-loops.html) - Scott Logic
47. [What Is Agentic Reason?](https://www.ibm.com/think/topics/agentic-reasoning) - IBM
48. [Agentic Reason and Tool Integration via RL](https://arxiv.org/html/2505.01441v1) - arXiv
49. [Show Your Work: Scratchpads for Intermediate Compute](https://arxiv.org/abs/2112.00114) - arXiv
50. [How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works) - Anthropic
51. [How the Agent Loop Works](https://platform.claude.com/docs/en/agent-sdk/agent-loop) - Anthropic
52. [Handle Stop Reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) - Anthropic
53. [Trace Claude Code's LLM Traffic](https://medium.com/@georgesung/tracing-claude-codes-llm-traffic-agentic-loop-sub-agents-tool-use-prompts-7796941806f5) - George Sung
54. [Claude Code: Behind the Scenes](https://blog.promptlayer.com/claude-code-behind-the-scenes-of-the-master-agent-loop/) - PromptLayer
55. [Claude Code Architecture (Reverse Engineered)](https://vrungta.substack.com/p/claude-code-architecture-reverse) - Substack
56. [LLMs Get Lost In Multi-Turn Conversation](https://arxiv.org/abs/2505.06120) - arXiv
57. [Tool Use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) - Anthropic
58. [Show Thought in Claude Code: Verbose Mode](https://wmedia.es/en/tips/claude-code-verbose-output-see-thinking) - wmedia
59. [Think as a Tool](https://patmcguinness.substack.com/p/thinking-as-a-tool) - Patrick McGuinness
60. [OpenAI Reason Models](https://platform.openai.com/docs/guides/reasoning) - OpenAI
61. [Inside Reason Models: o3 and DeepSeek R1](https://labs.adaline.ai/p/inside-reasoning-models-openai-o3) - Adaline Labs
62. [τ-bench: Tool-Agent-User Interaction Benchmark](https://arxiv.org/abs/2406.12045) - arXiv
63. [τ-bench: Shape Development Evaluation Agents](https://sierra.ai/blog/tau-bench-shaping-development-evaluation-agents) - Sierra
64. [OpenAI o3 Released: Benchmarks](https://www.helicone.ai/blog/openai-o3) - Helicone
65. [How Well Are Reason LLMs Perform?](https://workos.com/blog/reasoning-llms) - WorkOS
66. [Reason and Performance in LLMs: o3 Thinks Harder Not Longer](https://arxiv.org/html/2502.15631v1) - arXiv
