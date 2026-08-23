/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { api } from './api';

export interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

export interface CompraItem {
  id: string;
  tipo_item: 'bateria' | 'casco';
  cantidad: number;
  precio_unitario: number;
  productos: {
    modelo: string;
    descripcion: string | null;
  };
}

export interface Compra {
  id: string;
  folio: string;
  fecha: string;
  total: number;
  estado: string;
  proveedores: { nombre: string } | null;
  sucursales: { nombre: string };
  usuarios: { nombre_completo: string };
}

export interface CompraDetalle extends Compra {
  compra_items: CompraItem[];
}

export interface CompraItemInput {
  producto_id: string;
  tipo_item: 'bateria' | 'casco';
  cantidad: number;
  precio_unitario: number;
}

export interface RegistrarCompraInput {
  sucursal_id: string;
  proveedor_id?: string;
  items: CompraItemInput[];
}

export function listarProveedores() {
  return api<Proveedor[]>('/purchases/providers');
}

export function crearProveedor(input: Omit<Proveedor, 'id'>) {
  return api<Proveedor>('/purchases/providers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listarCompras() {
  return api<Compra[]>('/purchases');
}

export function obtenerCompra(id: string) {
  return api<CompraDetalle>(`/purchases/${id}`);
}

export function registrarCompra(input: RegistrarCompraInput) {
  return api<CompraDetalle>('/purchases', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
