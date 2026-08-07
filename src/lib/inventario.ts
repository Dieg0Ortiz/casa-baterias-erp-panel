import { api } from './api';

export interface ItemInventario {
  sucursal_id: string;
  producto_id: string | null;
  modelo: string | null;
  codigo_barras: string | null;
  marca: string | null;
  precio: number;
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

// Corrección de sucursal: mueve TODA la existencia de un producto dado de
// alta en la sucursal equivocada a la correcta, SIN registrar una
// transferencia. Las transferencias quedan para movimientos legítimos.
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

export interface EliminarExistenciaInput {
  producto_id: string;
  sucursal_id: string;
  cantidad?: number;
}

export function eliminarExistencias(input: EliminarExistenciaInput) {
  return api<unknown>('/inventory/eliminar-existencia', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
