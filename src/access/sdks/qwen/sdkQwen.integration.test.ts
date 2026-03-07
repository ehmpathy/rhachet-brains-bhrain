import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';
import {
  BrainArch1ToolDefinition,
  toJsonSchema,
} from '@src/domain.objects/BrainArch1/BrainArch1ToolDefinition';

import { sdkQwen } from './sdkQwen';

/**
 * .what = zod schema for file read tool input
 * .why = type-safe schema definition for integration test
 */
const schemaReadInput = z.object({
  path: z.string().describe('absolute file path'),
});

/**
 * .what = integration tests for qwen sdk
 * .why = verify real api calls work correctly
 *
 * .note = requires QWEN_API_KEY and QWEN_API_URL environment variables
 */
describe('sdkQwen', () => {
  const getContext = () => ({
    qwen: {
      auth: {
        key: process.env.QWEN_API_KEY ?? '',
        url:
          process.env.QWEN_API_URL ??
          'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
      llm: { model: 'qwen-max' },
    },
    log: console,
  });

  given('[case1] simple prompt with no tools', () => {
    when('[t0] generate is called with a greeting', () => {
      then('returns a text response', async () => {
        const context = getContext();
        if (!context.qwen.auth.key) {
          console.log('skipping: QWEN_API_KEY not set');
          return;
        }

        const result = await sdkQwen.generate(
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
    when('[t0] generate is called with a task requiring tool use', () => {
      then('returns tool calls', async () => {
        const context = getContext();
        if (!context.qwen.auth.key) {
          console.log('skipping: QWEN_API_KEY not set');
          return;
        }

        const result = await sdkQwen.generate(
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
