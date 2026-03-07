import { BrainRepl } from 'rhachet';
import { given, then, when } from 'test-fns';

import { genMockBrainArch1Context } from '@src/.test/genMockBrainArch1Context';

import { genBrainRepl } from './index';

/**
 * .what = unit tests for rhachet-brains-bhrain sdk exports
 * .why = verify public api exports are correct
 */
describe('rhachet-brains-bhrain.sdk', () => {
  given('[case1] genBrainRepl factory', () => {
    when('[t0] called with valid composite slug', () => {
      then('returns BrainRepl instance', async () => {
        // mock atom for unit test
        const mockAtom = {
          platform: 'test',
          model: 'test-model',
          description: 'test atom',
          generate: jest.fn(),
        };

        const repl = await genBrainRepl({
          slug: 'bhrain/arch1@test/model',
          atom: mockAtom as any,
          context: genMockBrainArch1Context(),
        });

        expect(repl).toBeInstanceOf(BrainRepl);
        expect(repl.slug).toEqual('bhrain/arch1@test/model');
      });
    });

    when('[t1] called with invalid slug (atom absent)', () => {
      then('throws BadRequestError', async () => {
        await expect(
          genBrainRepl({
            slug: 'bhrain/arch1' as any,
            atom: {} as any,
            context: genMockBrainArch1Context(),
          }),
        ).rejects.toThrow('repl slug requires @$atom suffix');
      });
    });
  });
});
