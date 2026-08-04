const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('erp_access_token');
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message =
        (body as { message?: string | string[] }).message?.toString() ??
        message;
    } catch {
      // ignora cuerpos no JSON
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}

export function setSessionTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem('erp_access_token', accessToken);
  window.localStorage.setItem('erp_refresh_token', refreshToken);
}

export function clearSessionTokens() {
  window.localStorage.removeItem('erp_access_token');
  window.localStorage.removeItem('erp_refresh_token');
}
