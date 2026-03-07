import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';

import { sdkAnthropic } from './sdkAnthropic';

/**
 * .what = zod schema for file read tool input
 * .why = type-safe schema definition for integration test
 */
const schemaReadInput = z.object({
  path: z.string().describe('absolute file path'),
});

/**
 * .what = integration tests for anthropic sdk
 * .why = verify real api calls work correctly
 *
 * .note = requires ANTHROPIC_API_KEY environment variable
 */
describe('sdkAnthropic', () => {
  const getContext = () => ({
    anthropic: {
      auth: { key: process.env.ANTHROPIC_API_KEY ?? '' },
      llm: { model: 'claude-sonnet-4-20250514' },
    },
    log: console,
  });

  given('[case1] simple prompt with no tools', () => {
    when('[t0] generate is called with a greeting', () => {
      then('returns a text response', async () => {
        const context = getContext();

        const result = await sdkAnthropic.generate(
          {
            messages: [
              new BrainArch1SessionMessage({
                role: 'user',
                content: 'say hello in exactly 3 words',
                toolCalls: null,
                toolCallId: null,
              }),
            ],
            tools: [],
          },
          context,
        );

        expect(result.message.role).toEqual('assistant');
        expect(result.message.content).toBeTruthy();
        expect(result.tokenUsage.totalTokens).toBeGreaterThan(0);
      });
    });
  });

  given('[case2] prompt with tools available', () => {
    when('[t0] generate is called with a task that requires tool use', () => {
      then('returns tool calls', async () => {
        const context = getContext();

        const result = await sdkAnthropic.generate(
          {
            messages: [
              new BrainArch1SessionMessage({
                role: 'user',
                content: 'read the file at /tmp/test.txt',
                toolCalls: null,
                toolCallId: null,
              }),
            ],
            tools: [
              new BrainArch1ToolDefinition({
                name: 'read',
                description: 'read file contents from disk',
                schema: { input: toJsonSchema(schemaReadInput) },
                strict: false,
              }),
            ],
          },
          context,
        );

        expect(result.message.role).toEqual('assistant');
        expect(result.message.toolCalls).toBeTruthy();
        expect(result.message.toolCalls?.length).toBeGreaterThan(0);
        expect(result.message.toolCalls?.[0]?.name).toEqual('read');
      });
    });
  });
});
