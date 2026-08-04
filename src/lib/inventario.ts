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
