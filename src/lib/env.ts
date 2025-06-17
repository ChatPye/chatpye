/**
 * Environment variable validation utility
 */

// Required environment variables for production
const REQUIRED_ENV_VARS = [
  'GEMINI_API_KEY',
  'YOUTUBE_API_KEY',
  'MONGODB_URI',
  'GOOGLE_AI_KEY'
] as const;

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = {
  MONGODB_DB_NAME: 'chatpye_db',
  NODE_ENV: 'development'
} as const;

/**
 * Validates that all required environment variables are set
 * @throws Error if any required environment variables are missing
 */
export function validateEnv() {
  // Skip validation in test environment
  if (isTestEnvironment()) {
    return;
  }

  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

/**
 * Gets an environment variable with type safety
 * @param key The environment variable key
 * @returns The environment variable value
 * @throws Error if the environment variable is not set
 */
export function getEnvVar(key: typeof REQUIRED_ENV_VARS[number]): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Gets an optional environment variable with a default value
 * @param key The environment variable key
 * @returns The environment variable value or its default
 */
export function getOptionalEnvVar<K extends keyof typeof OPTIONAL_ENV_VARS>(
  key: K
): string {
  return process.env[key] || OPTIONAL_ENV_VARS[key];
}

/**
 * Checks if we're running in a test environment
 * @returns true if running in test environment
 */
export function isTestEnvironment(): boolean {
  // Check for Vitest's test environment
  return process.env.VITEST === 'true' || 
         // Check for Jest's test environment
         process.env.JEST_WORKER_ID !== undefined ||
         // Check for Node's test environment
         process.env.NODE_ENV === 'test';
}

// Export the module
export default {
  validateEnv,
  getEnvVar,
  getOptionalEnvVar,
  isTestEnvironment
}; 