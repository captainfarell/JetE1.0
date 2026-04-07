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

export async function calculateEngine(request: CalculateRequest): Promise<EngineResults> {
  try {
    const res = await client.post<EngineResults>('/calculate', request);
    return res.data;
  } catch (err) {
    throw new Error(formatError(err));
  }
}

export async function calculateEnvelope(request: EnvelopeRequest): Promise<EnvelopeResults> {
  try {
    const res = await client.post<EnvelopeResults>('/envelope', request);
    return res.data;
  } catch (err) {
    throw new Error(formatError(err));
  }
}

export async function getDefaults(): Promise<DefaultsResponse> {
  try {
    const res = await client.get<DefaultsResponse>('/defaults');
    return res.data;
  } catch (err) {
    throw new Error(formatError(err));
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await client.get('/health');
    return true;
  } catch {
    return false;
  }
}
