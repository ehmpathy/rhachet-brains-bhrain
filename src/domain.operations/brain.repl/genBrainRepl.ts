import { BadRequestError } from 'helpful-errors';
import { asIsoPrice, dividePrice } from 'iso-price';
import type {
  AsBrainPromptFor,
  BrainAtom,
  BrainOutput,
  BrainOutputMetrics,
  BrainSpec,
} from 'rhachet';
import { BrainEpisode, BrainRepl, BrainSeries } from 'rhachet';
import type { BrainPlugs } from 'rhachet/brains';
import type { z } from 'zod';

import type { BrainArch1Context } from '@src/domain.objects/BrainArch1/BrainArch1Context';
import {
  type BrainArch1Config,
  invokeBrainArch1,
} from '@src/domain.operations/arch1/core/invokeBrainArch1';
import { toolboxBash } from '@src/domain.operations/arch1/plugins/toolboxes/bash';
import { toolboxFiles } from '@src/domain.operations/arch1/plugins/toolboxes/files';
import { toolboxWeb } from '@src/domain.operations/arch1/plugins/toolboxes/web';

/**
 * .what = readonly toolboxes for ask() mode
 * .why = prevents mutations in analysis operations
 */
const READONLY_TOOLBOXES = [toolboxFiles];

/**
 * .what = read+write toolboxes for act() mode
 * .why = enables full agentic capabilities
 */
const READWRITE_TOOLBOXES = [toolboxFiles, toolboxBash, toolboxWeb];

/**
 * .what = default brain spec for bhrain/arch1
 * .why = provides cost/gain info for the agentic repl
 * .note = costs are estimates; actual varies by source atom
 */
const BHRAIN_ARCH1_SPEC: BrainSpec = {
  cost: {
    time: {
      speed: { tokens: 100, per: { seconds: 1 } },
      latency: { milliseconds: 500 },
    },
    cash: {
      per: 'token',
      cache: {
        get: dividePrice({ of: '$0.30', by: 1000000 }), // $0.30/MTok cache read
        set: dividePrice({ of: '$3.75', by: 1000000 }), // $3.75/MTok cache write
      },
      input: dividePrice({ of: '$3', by: 1000000 }), // $3/MTok input
      output: dividePrice({ of: '$15', by: 1000000 }), // $15/MTok output
    },
  },
  gain: {
    size: { context: { tokens: 200000 } },
    grades: { swe: 72, mmlu: 90 },
    cutoff: '2025-04-01',
    domain: 'ALL',
    skills: { tooluse: true, vision: true },
  },
};

/**
 * .what = parses composite slug into repl and atom parts
 * .why = composite slug bakes atom choice into repl
 *
 * @example
 *   parseCompositeSlug('bhrain/arch1@claude/sonnet')
 *   // => { replSlug: 'bhrain/arch1', atomSlug: 'claude/sonnet' }
 */
const parseCompositeSlug = (input: {
  slug: string;
}): { replSlug: string; atomSlug: string | null } => {
  const atIndex = input.slug.indexOf('@');
  if (atIndex === -1) return { replSlug: input.slug, atomSlug: null };
  return {
    replSlug: input.slug.slice(0, atIndex),
    atomSlug: input.slug.slice(atIndex + 1),
  };
};

/**
 * .what = builds a zero-cost metrics object
 * .why = placeholder until proper cost calculation is added
 */
const buildZeroMetrics = (input: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}): BrainOutputMetrics => ({
  size: {
    tokens: {
      input: input.inputTokens,
      output: input.outputTokens,
      cache: {
        get: input.cacheReadTokens,
        set: input.cacheWriteTokens,
      },
    },
    chars: {
      input: 0,
      output: 0,
      cache: { get: 0, set: 0 },
    },
  },
  cost: {
    time: { seconds: 0 },
    cash: {
      total: asIsoPrice('USD 0.00'),
      deets: {
        input: asIsoPrice('USD 0.00'),
        output: asIsoPrice('USD 0.00'),
        cache: {
          get: asIsoPrice('USD 0.00'),
          set: asIsoPrice('USD 0.00'),
        },
      },
    },
  },
});

/**
 * .what = factory for BrainRepl that wraps BrainArch1
 * .why = exposes rhachet's BrainRepl interface; BrainArch1 powers it internally
 *
 * slug pattern: bhrain/arch1@$atom
 *   - bhrain/arch1@claude/sonnet
 *   - bhrain/arch1@xai/grok
 *   - bhrain/arch1 alone is invalid (repl requires atom)
 *
 * usage:
 *   const atom = genAtomAnthropic({ model: 'claude-sonnet-4-20250514' });
 *   const brain = await genBrainRepl({ slug: 'bhrain/arch1@claude/sonnet', atom, context });
 *   await brain.ask({ prompt, schema, role });
 */
export const genBrainRepl = async (input: {
  slug: `bhrain/arch1@${string}`;
  atom: BrainAtom;
  context: BrainArch1Context;
}): Promise<BrainRepl> => {
  // parse composite slug
  const { replSlug, atomSlug } = parseCompositeSlug({ slug: input.slug });

  // validate atom slug is provided
  if (!atomSlug) {
    throw new BadRequestError('repl slug requires @$atom suffix', {
      slug: input.slug,
      hint: 'use bhrain/arch1@claude/sonnet or bhrain/arch1@openai/gpt-4o',
    });
  }

  // validate repl slug is bhrain/arch1
  if (replSlug !== 'bhrain/arch1') {
    throw new BadRequestError('invalid repl slug', {
      slug: input.slug,
      replSlug,
      expected: 'bhrain/arch1',
    });
  }

  // create BrainRepl instance
  return new BrainRepl({
    repo: 'bhrain',
    slug: input.slug,
    spec: BHRAIN_ARCH1_SPEC,
    description: `bhrain agentic brain via BrainArch1, atom: ${atomSlug}`,
    ask: async <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(askInput: {
      on?: { episode?: BrainEpisode; series?: BrainSeries };
      plugs?: TPlugs;
      role?: { briefs?: unknown[] };
      prompt: AsBrainPromptFor<TPlugs>;
      schema: { output: z.Schema<TOutput> };
    }) => {
      // build config with readonly toolboxes (no intermediate domain object)
      const config: BrainArch1Config = {
        atom: input.atom,
        systemPrompt: null,
        toolboxes: READONLY_TOOLBOXES,
        maxIterations: 50,
        maxTokens: 200000,
        permissionGuard: null,
      };

      // extract prompt as string (tool continuations serialized as JSON)
      const userInput =
        typeof askInput.prompt === 'string'
          ? askInput.prompt
          : JSON.stringify(askInput.prompt);

      // invoke BrainArch1
      const result = await invokeBrainArch1(
        { config, userInput },
        input.context,
      );

      // build episode hash from timestamp (placeholder)
      const episodeHash = `bhrain-ask-${Date.now()}`;

      // transform to BrainOutput
      const output: BrainOutput<TOutput, 'repl', TPlugs> = {
        output: JSON.parse(result.finalResponse ?? '{}') as TOutput,
        calls: null,
        metrics: buildZeroMetrics({
          inputTokens: result.totalTokenUsage.inputTokens,
          outputTokens: result.totalTokenUsage.outputTokens,
          cacheReadTokens: result.totalTokenUsage.cacheReadTokens ?? 0,
          cacheWriteTokens: result.totalTokenUsage.cacheWriteTokens ?? 0,
        }),
        episode: new BrainEpisode({
          hash: episodeHash,
          exid: episodeHash,
          exchanges: [],
        }),
        series: new BrainSeries({
          hash: `bhrain-series-${Date.now()}`,
          exid: null,
          episodes: [],
        }),
      };
      return output;
    },
    act: async <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(actInput: {
      on?: { episode?: BrainEpisode; series?: BrainSeries };
      plugs?: TPlugs;
      role?: { briefs?: unknown[] };
      prompt: AsBrainPromptFor<TPlugs>;
      schema: { output: z.Schema<TOutput> };
    }) => {
      // build config with read+write toolboxes (no intermediate domain object)
      const config: BrainArch1Config = {
        atom: input.atom,
        systemPrompt: null,
        toolboxes: READWRITE_TOOLBOXES,
        maxIterations: 50,
        maxTokens: 200000,
        permissionGuard: null,
      };

      // extract prompt as string (tool continuations serialized as JSON)
      const userInput =
        typeof actInput.prompt === 'string'
          ? actInput.prompt
          : JSON.stringify(actInput.prompt);

      // invoke BrainArch1
      const result = await invokeBrainArch1(
        { config, userInput },
        input.context,
      );

      // build episode hash from timestamp (placeholder)
      const episodeHash = `bhrain-act-${Date.now()}`;

      // transform to BrainOutput
      const output: BrainOutput<TOutput, 'repl', TPlugs> = {
        output: JSON.parse(result.finalResponse ?? '{}') as TOutput,
        calls: null,
        metrics: buildZeroMetrics({
          inputTokens: result.totalTokenUsage.inputTokens,
          outputTokens: result.totalTokenUsage.outputTokens,
          cacheReadTokens: result.totalTokenUsage.cacheReadTokens ?? 0,
          cacheWriteTokens: result.totalTokenUsage.cacheWriteTokens ?? 0,
        }),
        episode: new BrainEpisode({
          hash: episodeHash,
          exid: episodeHash,
          exchanges: [],
        }),
        series: new BrainSeries({
          hash: `bhrain-series-${Date.now()}`,
          exid: null,
          episodes: [],
        }),
      };
      return output;
    },
  });
};
