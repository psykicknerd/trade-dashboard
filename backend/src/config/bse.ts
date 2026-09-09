const MAX_DELAY_MS = 29_000;
const MAX_BATCH_SIZE = 1_000;
const MAX_REQUEST_TIMEOUT_MS = 29_000;

function readPositiveInteger(name: string, fallback: number, maximum?: number): number {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || (maximum !== undefined && parsed > maximum)) {
    throw new Error(`${name} must be an integer between 0 and ${maximum ?? "Infinity"}.`);
  }
  return parsed;
}

const demoMode = process.env.DEMO_MODE !== "false";

export const bseConfig = {
  demoMode,
  delayMs: readPositiveInteger("BSE_DELAY_MS", demoMode ? 1_000 : 25_000, MAX_DELAY_MS),
  defaultBatchSize: readPositiveInteger("BSE_DEFAULT_BATCH_SIZE", demoMode ? 500 : 90, MAX_BATCH_SIZE),
  maxBatchSize: MAX_BATCH_SIZE,
  apiBaseUrl: process.env.BSE_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  requestTimeoutMs: readPositiveInteger("BSE_REQUEST_TIMEOUT_MS", 29_000, MAX_REQUEST_TIMEOUT_MS),
};
