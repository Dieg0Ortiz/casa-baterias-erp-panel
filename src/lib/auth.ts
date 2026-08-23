/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useSyncExternalStore } from 'react';
import { api, clearSessionTokens, setSessionTokens } from './api';

export interface PerfilUsuario {
  id: string;
  rol: 'trabajador' | 'administrador';
  sucursal_id: string | null;
  nombre_completo: string;
  activo: boolean;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  perfil: PerfilUsuario;
}

export interface Sesion {
  autenticado: boolean;
  perfil: PerfilUsuario | null;
}

const PERFIL_KEY = 'erp_perfil';
const SESSION_CHANGE_EVENT = 'erp_session_change';

export function getPerfil(): PerfilUsuario | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PERFIL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PerfilUsuario;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('erp_access_token');
}

/**
 * Suscribe a React a cambios de sesión. Escucha:
 * - `storage`: cambios de localStorage desde otras pestañas del navegador
 * - `erp_session_change`: cambios de sesión en la misma pestaña (login/logout)
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(SESSION_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
  };
}

/** Invalida la caché y notifica a React para que re-lea la sesión. */
function notificarCambioSesion() {
  cacheSesion = undefined;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

// Se cachea el snapshot para que useSyncExternalStore reciba una referencia
// estable entre lecturas sin cambios.
let cacheSesion: { key: string; sesion: Sesion } | undefined;

function leerSesion(): Sesion {
  const token = getAccessToken();
  const perfil = getPerfil();
  const key = `${token ?? ''}|${perfil?.id ?? ''}|${perfil?.rol ?? ''}`;
  if (cacheSesion?.key === key) return cacheSesion.sesion;
  const sesion: Sesion = { autenticado: token != null, perfil };
  cacheSesion = { key, sesion };
  return sesion;
}

/**
 * Estado de sesión del lado del cliente. En el servidor devuelve sesión
 * vacía (sin autenticar); tras la hidratación se lee el localStorage.
 * Persiste la sesión entre recargas de página gracias a localStorage.
 */
export function useSesion(): Sesion {
  return useSyncExternalStore(subscribe, leerSesion, () => ({
    autenticado: false,
    perfil: null,
  }));
}

export async function login(
  email: string,
  password: string,
): Promise<PerfilUsuario> {
  const res = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setSessionTokens(res.access_token, res.refresh_token);
  window.localStorage.setItem(PERFIL_KEY, JSON.stringify(res.perfil));
  notificarCambioSesion();
  return res.perfil;
}

export function logout() {
  clearSessionTokens();
  window.localStorage.removeItem(PERFIL_KEY);
  notificarCambioSesion();
}
