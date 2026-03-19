import { asIsoPrice, dividePrice } from 'iso-price';
import {
  BrainEpisode,
  type BrainOutputMetrics,
  type BrainSeries,
} from 'rhachet';
import type { BrainAtom, BrainPlugToolDefinition } from 'rhachet/brains';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';

import { generateBrainArch1LlmResponse } from './generateBrainArch1LlmResponse';

/**
 * .what = unit tests for generateBrainArch1LlmResponse
 * .why = verify atom.ask() is called and response is transformed to bhrain format
 */
describe('generateBrainArch1LlmResponse', () => {
  const getMockContext = genMockBrainArch1Context;

  const getMockAskResponse = () => ({
    output: 'test response',
    calls: null,
    metrics: {
      size: {
        tokens: { input: 10, output: 20, cache: { get: 0, set: 0 } },
        chars: { input: 5, output: 13, cache: { get: 0, set: 0 } },
      },
      cost: {
        time: { milliseconds: 100 },
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
    } as BrainOutputMetrics,
    episode: new BrainEpisode({
      hash: 'test-hash',
      exid: 'test-exid',
      exchanges: [],
    }),
    series: null as unknown as BrainSeries,
  });

  const createMockAtom = (askFn: jest.Mock = jest.fn()): BrainAtom => ({
    repo: 'test',
    slug: 'test/atom',
    description: 'mock atom for test',
    spec: {
      cost: {
        time: {
          speed: { tokens: 100, per: { seconds: 1 } },
          latency: { milliseconds: 100 },
        },
        cash: {
          per: 'token',
          input: dividePrice({ of: '$1', by: 1000000 }),
          output: dividePrice({ of: '$1', by: 1000000 }),
          cache: {
            get: dividePrice({ of: '$0', by: 1000000 }),
            set: dividePrice({ of: '$0', by: 1000000 }),
          },
        },
      },
      gain: {
        size: { context: { tokens: 100000 } },
        grades: { swe: 50, mmlu: 50 },
        cutoff: '2025-01-01',
        domain: 'ALL',
        skills: { tooluse: true, vision: false },
      },
    },
    ask: askFn,
  });

  given('[case1] atom.ask is called', () => {
    when('[t0] generateBrainArch1LlmResponse is invoked', () => {
      then('delegates to atom.ask and transforms response', async () => {
        const mockResponse = getMockAskResponse();
        const askFn = jest.fn().mockResolvedValue(mockResponse);
        const atom = createMockAtom(askFn);

        const messages = [
          new BrainArch1SessionMessage({
            role: 'user',
            content: 'hello',
            toolCalls: null,
            toolCallId: null,
          }),
        ];

        const result = await generateBrainArch1LlmResponse(
          {
            atom,
            messages,
            tools: [],
          },
          getMockContext(),
        );

        expect(askFn).toHaveBeenCalledTimes(1);
        expect(result.message.content).toEqual('test response');
        expect(result.message.role).toEqual('assistant');
        expect(result.tokenUsage.inputTokens).toEqual(10);
        expect(result.tokenUsage.outputTokens).toEqual(20);
      });
    });
  });

  given('[case2] atom returns tool calls', () => {
    when('[t0] calls.tools has invocations', () => {
      then('transforms to BrainArch1ToolCall format', async () => {
        const mockResponse = {
          ...getMockAskResponse(),
          output: null,
          calls: {
            tools: [
              { exid: 'call-1', slug: 'test-tool', input: { arg: 'value' } },
            ],
          },
        };
        const askFn = jest.fn().mockResolvedValue(mockResponse);
        const atom = createMockAtom(askFn);

        const result = await generateBrainArch1LlmResponse(
          {
            atom,
            messages: [],
            tools: [],
          },
          getMockContext(),
        );

        expect(result.message.content).toBeNull();
        expect(result.message.toolCalls).toHaveLength(1);
        expect(result.message.toolCalls![0]!.id).toEqual('call-1');
        expect(result.message.toolCalls![0]!.name).toEqual('test-tool');
        expect(result.message.toolCalls![0]!.input).toEqual({ arg: 'value' });
      });
    });
  });

  given('[case3] tools are provided', () => {
    when('[t0] tools array has definitions', () => {
      then('passes tools via plugs.tools to atom.ask', async () => {
        const mockResponse = getMockAskResponse();
        const askFn = jest.fn().mockResolvedValue(mockResponse);
        const atom = createMockAtom(askFn);

        const myTool: BrainPlugToolDefinition = {
          slug: 'my-tool',
          name: 'my-tool',
          description: 'a test tool',
          schema: { input: z.object({}), output: z.object({}) },
        };

        await generateBrainArch1LlmResponse(
          {
            atom,
            messages: [],
            tools: [myTool],
          },
          getMockContext(),
        );

        // verify ask was called with tools in plugs
        const callArgs = askFn.mock.calls[0][0];
        expect(callArgs.plugs.tools).toHaveLength(1);
        expect(callArgs.plugs.tools[0].slug).toEqual('my-tool');
        expect(callArgs.plugs.tools[0].description).toEqual('a test tool');
      });
    });
  });
});
