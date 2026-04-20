import axios, { AxiosError } from 'axios';
import type {
  CalculateRequest,
  DefaultsResponse,
  EngineResults,
  EnvelopeRequest,
  EnvelopeResults,
} from '../types/engine';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

function formatError(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) {
      return 'Cannot connect to the backend server. Make sure it is running on port 8000.';
    }
    const detail = err.response.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join('; ');
    }
    return `Server error ${err.response.status}: ${err.response.statusText}`;
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

// ─── Wake-up retry ────────────────────────────────────────────────────────────
// Render's free tier spins down after 15 min of inactivity. The first request
// after idle gets a network error while the container boots (~30–50s).
// This wrapper retries on network errors only (no response), reports elapsed
// time via onStatus, and gives up after MAX_ATTEMPTS × INTERVAL_MS.

const MAX_ATTEMPTS    = 10;
const INTERVAL_MS     = 5_000;

type StatusCallback = (msg: string | null) => void;

async function retryOnWakeUp<T>(
  fn: () => Promise<T>,
  onStatus: StatusCallback,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) onStatus(null);
      return result;
    } catch (err) {
      const isNetworkError = err instanceof AxiosError && !err.response;
      if (!isNetworkError || attempt === MAX_ATTEMPTS) {
        onStatus(null);
        throw new Error(formatError(err));
      }
      const elapsed = attempt * INTERVAL_MS / 1000;
      onStatus(`Backend is waking up… ${elapsed}s elapsed, retrying`);
      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }
  }
  // Unreachable — last iteration always throws above — but satisfies TypeScript.
  throw new Error('Backend did not respond.');
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function calculateEngine(
  request: CalculateRequest,
  onStatus: StatusCallback = () => {},
): Promise<EngineResults> {
  return retryOnWakeUp(
    () => client.post<EngineResults>('/calculate', request).then(r => r.data),
    onStatus,
  );
}

export async function calculateEnvelope(
  request: EnvelopeRequest,
  onStatus: StatusCallback = () => {},
): Promise<EnvelopeResults> {
  return retryOnWakeUp(
    () => client.post<EnvelopeResults>('/envelope', request).then(r => r.data),
    onStatus,
  );
}

export async function getDefaults(
  onStatus: StatusCallback = () => {},
): Promise<DefaultsResponse> {
  return retryOnWakeUp(
    () => client.get<DefaultsResponse>('/defaults').then(r => r.data),
    onStatus,
  );
}

export async function healthCheck(): Promise<boolean> {
  try {
    await client.get('/health');
    return true;
  } catch {
    return false;
  }
}
