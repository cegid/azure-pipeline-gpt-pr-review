/**
 * Retrieves an input from the runtime environment.
 * These inputs are typically set by the user.
 * @param {string} _name - The name of the input to retrieve.
 * @param {boolean} _required - Whether the input is required.
 * @returns {Promise<string>} The value of the input.
 * */
export async function getInput(_name: string, _required?: boolean): Promise<string> {
  const tl = await require("azure-pipelines-task-lib/task");
  const input = tl.getInput(_name);
  if (!input) {
    // Get the env variable from the process
    const variableEnv = _name.toUpperCase().replace(/\./g, '_');
    const env = process.env[variableEnv] || '';
    if (_required && !env) {
      throw new Error(`Input required and not supplied: ${_name}`);
    }
    return env;
  }
  return input;
}

/**
 * Retrieves an input from the runtime environment.
 * These inputs are typically set by the user.
 * @param {string} _name - The name of the input to retrieve.
 * @param {boolean} _required - Whether the input is required.
 * @returns {Promise<boolean>} The value of the input.
 * */
export async function getBoolInput(_name: string, _required?: boolean): Promise<boolean> {
  const tl = await require("azure-pipelines-task-lib/task");
  const input = tl.getBoolInput(_name);
  if (!input) {
    // Get the env variable from the process
    const variableEnv = _name.toUpperCase().replace(/\./g, '_');
    const env = Boolean(process.env[variableEnv] || false);
    if (_required && !env) {
      throw new Error(`Input required and not supplied: ${_name}`);
    }
    return env;
  }
  return input;
}
