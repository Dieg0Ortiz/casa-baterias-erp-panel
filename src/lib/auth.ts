/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
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

/** Notifica a todos los hooks useSesion que la sesión cambió. */
function notificarCambioSesion() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

/** Lee la sesión actual directamente de localStorage. */
function leerSesionActual(): Sesion {
  const token = getAccessToken();
  const perfil = getPerfil();
  return { autenticado: token != null, perfil };
}

/**
 * Estado de sesión del lado del cliente.
 *
 * Usa useState con lazy initialization para leer localStorage
 * sincrónicamente en el primer render del cliente. Esto garantiza
 * que `autenticado` sea `true` desde el primer render si hay tokens
 * guardados, evitando el redirect falso a /login al refrescar.
 *
 * En el servidor (SSR) devuelve { autenticado: false, perfil: null }.
 */
export function useSesion(): Sesion {
  const [sesion, setSesion] = useState<Sesion>(() => {
    // SSR: no hay localStorage
    if (typeof window === 'undefined') {
      return { autenticado: false, perfil: null };
    }
    // Cliente: lee localStorage sincrónicamente en el primer render
    return leerSesionActual();
  });

  useEffect(() => {
    // Re-leer al montar como safety net (por si la lazy init
    // no capturó el estado más reciente durante hidratación).
    setSesion(leerSesionActual());

    function actualizar() {
      setSesion(leerSesionActual());
    }

    // Escuchar cambios de localStorage desde otras pestañas
    window.addEventListener('storage', actualizar);
    // Escuchar login/logout en la misma pestaña
    window.addEventListener(SESSION_CHANGE_EVENT, actualizar);
    return () => {
      window.removeEventListener('storage', actualizar);
      window.removeEventListener(SESSION_CHANGE_EVENT, actualizar);
    };
  }, []);

  return sesion;
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

