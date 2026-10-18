// cli-contract.mjs — strict, no-write CLI introspection and value-flag parsing.

export class CliUsageError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.name = 'CliUsageError';
    this.exitCode = exitCode;
  }
}

export function printHelpIfRequested(args = [], usage = '', write = console.log) {
  if (!args.includes('--help') && !args.includes('-h')) return false;
  write(String(usage).trim());
  return true;
}

export function readValueArg(args = [], name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new CliUsageError(`${name} requires a value`);
  return value;
}

export default { CliUsageError, printHelpIfRequested, readValueArg };
