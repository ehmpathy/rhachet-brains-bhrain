import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { genBrainAtom as genAtomXai } from 'rhachet-brains-xai';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { REPEATABLY_CONFIG } from '@src/.test/infra/repeatably';
import { logOutputHead } from '@src/.test/logOutputHead';
import {
  type BrainArch1Config,
  invokeBrainArch1,
} from '@src/domain.operations/arch1/core/invokeBrainArch1';
import { toolboxFiles } from '@src/domain.operations/arch1/plugins/toolboxes/files';

/**
 * .what = xai code generation integration tests for invokeBrainArch1
 * .why = verify brain can write code that follows conventions from briefs
 *
 * .note = requires XAI_API_KEY env var
 * .note = uses mechanic briefs via `npx rhachet roles boot --role mechanic`
 * .note = skipped in CI: requires mechanic role linked locally
 */
describe.skip('invokeBrainArch1.xai.codewrite', () => {
  const getContext = () => ({
    creds: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        url: null,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY ?? '',
        url: null,
      },
      tavily: {
        apiKey: process.env.TAVILY_API_KEY ?? '',
      },
    },
    log: console,
  });

  given('[case1] xai with code generation from briefs', () => {
    // extend timeout for code generation (3 minutes)
    jest.setTimeout(180000);

    when('[t0] given mechanic briefs and a weather api spec', () => {
      then.repeatably(REPEATABLY_CONFIG)(
        'writes shell command that works',
        async () => {
          const context = getContext();

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const outputDir = path.join(
            process.cwd(),
            '.test',
            '.temp',
            `codegen.v${timestamp}`,
          );
          await fs.mkdir(outputDir, { recursive: true });

          // set up network sandbox: curl wrapper that blocks unauthorized domains
          const binDir = path.join(outputDir, 'bin');
          const networkLogPath = path.join(outputDir, 'network.log');
          const realCurlPath = execSync('which curl', {
            encoding: 'utf-8',
          }).trim();
          await fs.mkdir(binDir, { recursive: true });
          await fs.writeFile(networkLogPath, '');

          // curl wrapper: logs calls, blocks non-allowlisted domains
          const curlWrapper = `#!/usr/bin/env bash
ALLOWED_DOMAIN="api.open-meteo.com"
LOG_FILE="${networkLogPath}"

# log the call
echo "CURL_CALL: $*" >> "$LOG_FILE"

# find url argument
URL_ARG=""
for arg in "$@"; do
  if [[ "$arg" == http* ]]; then
    URL_ARG="$arg"
    break
  fi
done

# block unauthorized domains
if [[ -n "$URL_ARG" && "$URL_ARG" != *"$ALLOWED_DOMAIN"* ]]; then
  echo "BLOCKED: $URL_ARG" >> "$LOG_FILE"
  echo "Error: Network call to unauthorized domain blocked: $URL_ARG" >&2
  exit 1
fi

# pass through to real curl
${realCurlPath} "$@"
`;
          await fs.writeFile(path.join(binDir, 'curl'), curlWrapper);
          await fs.chmod(path.join(binDir, 'curl'), 0o755);

          // get mechanic briefs
          const briefsRaw = execSync('npx rhachet roles boot --role mechanic', {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
          });

          // create test tool for brain to verify its own code
          const toolTest = genBrainPlugToolDeclaration({
            slug: 'test',
            name: 'test',
            description:
              'Execute a shell command to test your code. Use this to verify your generated code works correctly before you finish.',
            schema: {
              input: z.object({
                command: z
                  .string()
                  .describe(
                    'The shell command to execute (e.g., "./get-weather.sh --lat 30.2672 --lon -97.7431")',
                  ),
              }),
              output: z.object({
                stdout: z.string().describe('Standard output from the command'),
                stderr: z.string().describe('Standard error from the command'),
                exitCode: z.number().describe('Exit code (0 = success)'),
              }),
            },
            execute: async ({ invocation }) => {
              // use sandboxed PATH: our curl wrapper first, then system PATH
              const sandboxedEnv = {
                ...process.env,
                PATH: `${binDir}:${process.env.PATH}`,
              };
              try {
                const stdout = execSync(invocation.input.command, {
                  encoding: 'utf-8',
                  cwd: outputDir,
                  timeout: 30000,
                  env: sandboxedEnv,
                });
                return { stdout, stderr: '', exitCode: 0 };
              } catch (error: unknown) {
                const execError = error as {
                  stdout?: string;
                  stderr?: string;
                  status?: number;
                };
                return {
                  stdout: execError.stdout ?? '',
                  stderr: execError.stderr ?? String(error),
                  exitCode: execError.status ?? 1,
                };
              }
            },
          });

          // create chmod tool for brain to make files executable
          const toolChmod = genBrainPlugToolDeclaration({
            slug: 'chmod',
            name: 'chmod',
            description:
              'Make a file executable. Use this after you write a shell command to make it runnable.',
            schema: {
              input: z.object({
                path: z
                  .string()
                  .describe('The path to the file to make executable'),
              }),
              output: z.object({
                success: z.boolean().describe('Whether chmod succeeded'),
              }),
            },
            execute: async ({ invocation }) => {
              try {
                await fs.chmod(invocation.input.path, 0o755);
                return { success: true };
              } catch {
                return { success: false };
              }
            },
          });

          const config: BrainArch1Config = {
            atom: genAtomXai({ slug: 'xai/grok/code-fast-1' }),
            toolboxes: [toolboxFiles, [toolChmod, toolTest]],
            systemPrompt: `You are a senior software engineer. Follow the conventions in these briefs:

${briefsRaw}

IMPORTANT: After you write code to a file, you must also provide a verbal confirmation in your response. File writes alone are not sufficient - always respond with a summary of what you did.

You have access to a 'chmod' tool to make files executable, and a 'test' tool to run commands. After you write a shell command:
1. Use chmod to make it executable
2. Use test to verify it works with Austin, TX coordinates (--lat 30.2672 --lon -97.7431)`,
            maxIterations: 100,
            maxTokens: 128000,
            permissionGuard: null,
          };

          const commandPath = path.join(outputDir, 'get-weather.sh');

          const result = await invokeBrainArch1(
            {
              config,
              userInput: `Write a shell command that fetches weather data from the Open-Meteo API (free, no auth required).

## spec

- input: latitude and longitude as named arguments (--lat and --lon)
- output: JSON object with { emoji, temperature, title, description }
- use curl to fetch from: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true
- use jq to parse the response
- map weather codes to emoji (0=☀️, 1-3=⛅, 45-48=🌫️, 51-67=🌧️, 71-77=❄️, 80-99=⛈️)
- temperature from current_weather.temperature
- title: short description (e.g., "Sunny", "Cloudy", "Rain")
- description: fuller description with temperature

Write the command to: ${commandPath}

After you write it, use the test tool to verify it works with Austin, TX coordinates (--lat 30.2672 --lon -97.7431).`,
            },
            context,
          );

          logOutputHead({
            label: 'brainArch1.xai.codegen',
            output: result.finalResponse ?? '',
          });

          expect(result.terminationReason).toBe('NATURAL_COMPLETION');
          expect(result.finalResponse).toBeTruthy();

          // check command was written
          const commandExists = await fs
            .access(commandPath)
            .then(() => true)
            .catch(() => false);
          expect(commandExists).toBe(true);

          const commandContent = await fs.readFile(commandPath, 'utf-8');
          console.log('Command written to:', commandPath);
          console.log('Command length:', commandContent.length, 'characters');

          // verify command follows conventions from briefs
          expect(commandContent).toContain('#!/'); // has shebang
          expect(commandContent).toContain('curl'); // uses curl
          expect(commandContent).toContain('jq'); // uses jq
          expect(commandContent).toContain('--lat'); // named args
          expect(commandContent).toContain('--lon'); // named args
          expect(commandContent).toContain('open-meteo'); // correct api

          // prove it works: run the command with Austin, TX coordinates (sandboxed)
          await fs.chmod(commandPath, 0o755);
          const sandboxedEnv = {
            ...process.env,
            PATH: `${binDir}:${process.env.PATH}`,
          };
          const weatherOutput = execSync(
            `${commandPath} --lat 30.2672 --lon -97.7431`,
            { encoding: 'utf-8', env: sandboxedEnv },
          );
          console.log('Weather output:', weatherOutput);

          const weather = JSON.parse(weatherOutput);
          expect(weather).toHaveProperty('emoji');
          expect(weather).toHaveProperty('temperature');
          expect(weather).toHaveProperty('title');
          expect(weather).toHaveProperty('description');
          expect(typeof weather.temperature).toBe('number');

          // verify network sandbox: check the log for api calls
          const networkLog = await fs.readFile(networkLogPath, 'utf-8');
          console.log('Network log:', networkLog);

          // verify no blocked calls (would indicate unauthorized network access)
          expect(networkLog).not.toContain('BLOCKED:');

          // verify at least one call was made to the weather api
          const apiCalls = networkLog
            .split('\n')
            .filter((line) => line.includes('api.open-meteo.com'));
          expect(apiCalls.length).toBeGreaterThan(0);
          console.log(`Verified ${apiCalls.length} call(s) to weather API`);
        },
      );
    });
  });
});
