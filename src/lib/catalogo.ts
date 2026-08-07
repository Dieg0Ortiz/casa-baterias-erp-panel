import { api } from './api';

export interface Marca {
  id: string;
  nombre: string;
  descripcion: string | null;
  ficha_tecnica_url: string | null;
}

export interface Sucursal {
  id: string;
  nombre: string;
  es_matriz: boolean;
}

export interface Existencia {
  cantidad: number;
  cascos_disponibles: number;
  sucursal_id: string;
}

export interface Producto {
  id: string;
  modelo: string;
  descripcion: string | null;
  precio: number;
  requiere_casco: boolean;
  codigo_barras: string;
  codigo_barras_origen: string;
  activo: boolean;
  marcas: { id?: string; nombre: string } | null;
  inventario: Existencia[];
}

export interface NuevoProductoInput {
  marca_id: string;
  modelo: string;
  descripcion?: string;
  precio: number;
  requiere_casco?: boolean;
  codigo_barras_fabrica?: string;
  sucursal_id?: string;
  cantidad_inicial?: number;
}

export interface EditarProductoInput {
  marca_id?: string;
  modelo?: string;
  descripcion?: string;
  precio?: number;
  requiere_casco?: boolean;
}

export interface NuevaMarcaInput {
  nombre: string;
  descripcion?: string;
  ficha_tecnica_url?: string;
}

export function listarMarcas() {
  return api<Marca[]>('/catalog/marcas');
}

export function crearMarca(input: NuevaMarcaInput) {
  return api<Marca>('/catalog/marcas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function actualizarMarca(id: string, cambios: NuevaMarcaInput) {
  return api<Marca>(`/catalog/marcas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
}

export function eliminarMarca(id: string) {
  return api<{ eliminado: boolean }>(`/catalog/marcas/${id}`, {
    method: 'DELETE',
  });
}

export function listarProductos() {
  return api<Producto[]>('/catalog/productos');
}

export function listarSucursales() {
  return api<Sucursal[]>('/catalog/sucursales');
}

export function crearProducto(input: NuevoProductoInput) {
  return api<Producto>('/catalog/productos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function actualizarProducto(id: string, cambios: EditarProductoInput) {
  return api<Producto>(`/catalog/productos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
}

export function actualizarPrecio(id: string, precio: number) {
  return api<unknown>(`/catalog/productos/${id}/precio`, {
    method: 'PATCH',
    body: JSON.stringify({ precio }),
  });
}

export function darDeBaja(id: string) {
  return api<unknown>(`/catalog/productos/${id}/baja`, { method: 'POST' });
}

const dinero = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

export function formatearDinero(valor: number): string {
  return dinero.format(valor);
}

export function stockTotal(producto: Producto): number {
  return (producto.inventario ?? []).reduce(
    (suma, e) => suma + e.cantidad,
    0,
  );
}
