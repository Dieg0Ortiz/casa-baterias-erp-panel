/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('erp_access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('erp_refresh_token');
}

/** Renovación en curso, para que varias peticiones compartan un solo intento. */
let renovacionEnCurso: Promise<boolean> | null = null;

/**
 * El access token de Supabase dura una hora. Al vencer se renueva con el
 * refresh token; si eso falla, se limpia la sesión y se vuelve al login.
 */
async function renovarSesion(): Promise<boolean> {
  if (renovacionEnCurso) return renovacionEnCurso;

  renovacionEnCurso = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        clearSessionTokens();
        return false;
      }
      const body = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!body.access_token || !body.refresh_token) {
        clearSessionTokens();
        return false;
      }
      setSessionTokens(body.access_token, body.refresh_token);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await renovacionEnCurso;
  } finally {
    renovacionEnCurso = null;
  }
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
  let res = await peticion(path, options);

  const esRutaDeSesion =
    path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
  if (res.status === 401 && !esRutaDeSesion && (await renovarSesion())) {
    res = await peticion(path, options);
  }

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

  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

function peticion(path: string, options: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export function setSessionTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem('erp_access_token', accessToken);
  window.localStorage.setItem('erp_refresh_token', refreshToken);
}

export function clearSessionTokens() {
  window.localStorage.removeItem('erp_access_token');
  window.localStorage.removeItem('erp_refresh_token');
}
