import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';
import type { BrainArch1Atom } from '@src/domain.objects/BrainArch1/BrainArch1Atom';
import { BrainArch1MemoryTokenUsage } from '@src/domain.objects/BrainArch1/BrainArch1MemoryTokenUsage';
import { BrainArch1SessionMessage } from '@src/domain.objects/BrainArch1/BrainArch1SessionMessage';

import { generateBrainArch1LlmResponse } from './generateBrainArch1LlmResponse';

/**
 * .what = unit tests for generateBrainArch1LlmResponse
 * .why = verify atom.generate() is called correctly with input parameters
 */
describe('generateBrainArch1LlmResponse', () => {
  const getMockContext = genMockBrainArch1Context;

  const getMockResponse = () => ({
    message: new BrainArch1SessionMessage({
      role: 'assistant' as const,
      content: 'test response',
      toolCalls: null,
      toolCallId: null,
    }),
    tokenUsage: new BrainArch1MemoryTokenUsage({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      cacheReadTokens: null,
      cacheWriteTokens: null,
    }),
  });

  const createMockAtom = (
    generateFn: jest.Mock = jest.fn(),
  ): BrainArch1Atom => ({
    platform: 'test',
    model: 'test-atom',
    description: 'mock atom for testing',
    generate: generateFn,
  });

  given('[case1] atom.generate is called', () => {
    when('[t0] generateBrainArch1LlmResponse is invoked', () => {
      then('delegates to atom.generate with correct params', async () => {
        const mockResponse = getMockResponse();
        const generateFn = jest.fn().mockResolvedValue(mockResponse);
        const atom = createMockAtom(generateFn);

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

        expect(generateFn).toHaveBeenCalledTimes(1);
        expect(generateFn).toHaveBeenCalledWith(
          expect.objectContaining({
            messages,
            tools: [],
          }),
          expect.anything(),
        );
        expect(result.message.content).toEqual('test response');
      });
    });
  });

  given('[case2] maxTokens is provided', () => {
    when('[t0] generateBrainArch1LlmResponse is called', () => {
      then('passes maxTokens to atom.generate', async () => {
        const mockResponse = getMockResponse();
        const generateFn = jest.fn().mockResolvedValue(mockResponse);
        const atom = createMockAtom(generateFn);

        await generateBrainArch1LlmResponse(
          {
            atom,
            messages: [],
            tools: [],
            maxTokens: 4096,
          },
          getMockContext(),
        );

        expect(generateFn).toHaveBeenCalledWith(
          expect.objectContaining({
            maxTokens: 4096,
          }),
          expect.anything(),
        );
      });
    });
  });

  given('[case3] atom.generate returns response', () => {
    when('[t0] response contains message and tokenUsage', () => {
      then('returns the response unchanged', async () => {
        const mockResponse = getMockResponse();
        const generateFn = jest.fn().mockResolvedValue(mockResponse);
        const atom = createMockAtom(generateFn);

        const result = await generateBrainArch1LlmResponse(
          {
            atom,
            messages: [],
            tools: [],
          },
          getMockContext(),
        );

        expect(result.message).toBe(mockResponse.message);
        expect(result.tokenUsage).toBe(mockResponse.tokenUsage);
      });
    });
  });
});
