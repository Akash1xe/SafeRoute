import type {
  CalculatedRoute,
  Incident,
  IncidentCategory,
  PublicUser,
  RoadNode,
} from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface ApiEnvelope<T> {
  data: T;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

export async function getNodes(): Promise<RoadNode[]> {
  const response =
    await request<ApiEnvelope<{ nodes: RoadNode[] }>>('/routes/nodes');
  return response.data.nodes;
}

export async function calculateRoutes(
  originNodeId: string,
  destinationNodeId: string,
): Promise<CalculatedRoute[]> {
  const response = await request<ApiEnvelope<{ routes: CalculatedRoute[] }>>(
    '/routes/calculate',
    {
      method: 'POST',
      body: JSON.stringify({ originNodeId, destinationNodeId }),
    },
  );
  return response.data.routes;
}

export async function getNearbyIncidents(
  latitude: number,
  longitude: number,
): Promise<Incident[]> {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radiusMeters: '2500',
  });
  const response = await request<ApiEnvelope<{ incidents: Incident[] }>>(
    `/incidents/nearby?${query.toString()}`,
  );
  return response.data.incidents;
}

export async function authenticate(
  mode: 'login' | 'register',
  input: { name?: string; email: string; password: string },
): Promise<AuthResult> {
  const response = await request<ApiEnvelope<AuthResult>>(`/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function restoreSession(): Promise<AuthResult | null> {
  try {
    const response = await request<ApiEnvelope<AuthResult>>('/auth/refresh', {
      method: 'POST',
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function createIncident(
  accessToken: string,
  input: {
    category: IncidentCategory;
    description: string;
    severity: number;
    latitude: number;
    longitude: number;
  },
): Promise<Incident> {
  const response = await request<ApiEnvelope<{ incident: Incident }>>(
    '/incidents',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input),
    },
  );
  return response.data.incident;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? 'The request could not be completed',
    );
  }
  return payload as unknown as T;
}
