/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { api } from './api';

export interface ItemInventario {
  sucursal_id: string;
  producto_id: string | null;
  modelo: string | null;
  codigo_barras: string | null;
  marca: string | null;
  precio: number;
  precio_2?: number | null;
  precio_3?: number | null;
  requiere_casco: boolean;
  cantidad: number;
  cascos_disponibles: number;
}

export function listarInventario(sucursalId?: string) {
  const q = sucursalId ? `?sucursal_id=${encodeURIComponent(sucursalId)}` : '';
  return api<ItemInventario[]>(`/inventory${q}`);
}

export interface Transferencia {
  id: string;
  producto: string | null;
  sucursal_origen: string | null;
  sucursal_destino: string | null;
  cantidad: number;
  autorizado_por: string | null;
  nota: string | null;
  created_at: string;
}

export interface TransferenciaInput {
  producto_id: string;
  sucursal_origen_id: string;
  sucursal_destino_id: string;
  cantidad: number;
  nota?: string;
}

export function transferirInventario(input: TransferenciaInput) {
  return api<unknown>('/inventory/transferencias', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listarTransferencias() {
  return api<Transferencia[]>('/inventory/transferencias');
}

export interface CorregirSucursalInput {
  producto_id: string;
  sucursal_origen_id: string;
  sucursal_destino_id: string;
}

export function corregirSucursal(input: CorregirSucursalInput) {
  return api<unknown>('/inventory/corregir-sucursal', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface ReabastecerInput {
  producto_id: string;
  sucursal_id: string;
  cantidad: number;
  nota?: string;
}

export function reabastecerInventario(input: ReabastecerInput) {
  return api<unknown>('/inventory/reabastecer', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface CargaMasivaInput {
  sucursal_id: string;
  /** `sumar` acumula sobre lo que ya hay; `reemplazar` deja la cantidad exacta. */
  modo: 'sumar' | 'reemplazar';
  items: { codigo_barras: string; cantidad: number }[];
}

export interface CargaMasivaResultado {
  modo: string;
  aplicados: number;
  unidades: number;
  no_encontrados: string[];
}

export function cargarExistenciasMasivo(input: CargaMasivaInput) {
  return api<CargaMasivaResultado>('/inventory/carga-masiva', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface AjustarInventarioInput {
  producto_id: string;
  sucursal_id: string;
  cantidad: number;
  motivo?: string;
}

export function ajustarInventario(input: AjustarInventarioInput) {
  return api<unknown>('/inventory/ajustar', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface EliminarExistenciasInput {
  producto_id: string;
  sucursal_id: string;
  /** Si se omite, el API vacía la existencia a 0. */
  cantidad?: number;
}

export function eliminarExistencias(input: EliminarExistenciasInput) {
  return api<unknown>('/inventory/eliminar-existencia', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
