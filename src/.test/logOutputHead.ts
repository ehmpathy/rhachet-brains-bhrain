/**
 * .what = logs the first N lines of output for test observability
 * .why = enables quick view of brain output without full scroll
 */
export const logOutputHead = (input: {
  label: string;
  output: string;
  lines?: number;
}): void => {
  const lines = input.lines ?? 30;
  const head = input.output.split('\n').slice(0, lines).join('\n');
  console.log(`\n📋 ${input.label} (head ${lines} lines):\n${head}\n`);
};
