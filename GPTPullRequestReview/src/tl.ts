/**
 * Retrieves an input from the runtime environment.
 * These inputs are typically set by the user.
 * @param {string} _name - The name of the input to retrieve.
 * @param {boolean} _required - Whether the input is required.
 * @returns {string} The value of the input.
 * */
export function getInput(_name: string, _required?: boolean): string {
  const tl = require("azure-pipelines-task-lib/task");
  const input = tl.getInput(_name);
  if (!input) {
    // Get the env variable from the process
    const variableEnv = _name.toUpperCase().replace(/\./g, '_');
    return process.env[variableEnv] || '';
  }
  return input;
}
