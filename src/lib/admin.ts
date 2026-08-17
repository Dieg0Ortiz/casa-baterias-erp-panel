import { api } from './api';

// Tipos del dashboard consolidado (Fase 8).
export interface CajaSucursal {
  corte_id: string;
  usuario_id: string;
  monto_inicial: number;
  total_ventas: number;
  monto_esperado: number;
}

export interface SucursalResumen {
  sucursal_id: string;
  nombre: string;
  es_matriz: boolean;
  ventas_hoy: number;
  monto_ventas_hoy: number;
  unidades_inventario: number;
  valor_inventario: number;
  caja: CajaSucursal | null;
}

export interface ResumenGeneral {
  ventas_hoy: number;
  monto_ventas_hoy: number;
  unidades_inventario: number;
  valor_inventario: number;
  cajas_abiertas: number;
  valor_esperado_cajas: number;
}

export interface VentaFeed {
  id: string;
  folio: string;
  total: number;
  sucursal: string | null;
  usuario: string | null;
  created_at: string;
  metodo_pago: string | null;
}

export interface Dashboard {
  fecha: string;
  resumen: ResumenGeneral;
  por_sucursal: SucursalResumen[];
  ultimas_ventas: VentaFeed[];
}

// Tipos del reporte de ventas (Fase 8).
export interface ItemVentaReporte {
  producto: string | null;
  cantidad: number;
  precio_unitario: number;
  tipo_precio?: string | null;
}

export interface VentaReporte {
  id: string;
  folio: string;
  total: number;
  estado: string;
  sucursal: string | null;
  usuario: string | null;
  created_at: string;
  metodo_pago: string | null;
  items: ItemVentaReporte[];
}

export interface ReporteVentas {
  ventas: VentaReporte[];
  totales: { ventas: number; monto: number; unidades: number };
}

export interface Empleado {
  id: string;
  nombre_completo: string;
  rol: string;
  sucursal_id: string | null;
  activo: boolean;
}

export interface FiltrosReporte {
  sucursal_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  usuario_id?: string;
  producto_id?: string;
}

export function obtenerDashboard() {
  return api<Dashboard>('/admin/dashboard');
}

export function listarEmpleados() {
  return api<Empleado[]>('/admin/usuarios');
}

export function obtenerReporteVentas(filtros: FiltrosReporte) {
  const params = new URLSearchParams();
  if (filtros.sucursal_id) params.set('sucursal_id', filtros.sucursal_id);
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
  if (filtros.usuario_id) params.set('usuario_id', filtros.usuario_id);
  if (filtros.producto_id) params.set('producto_id', filtros.producto_id);
  const q = params.toString();
  return api<ReporteVentas>(`/admin/reportes/ventas${q ? `?${q}` : ''}`);
}

// ----- Cascos Pendientes (sistema de comisión por depósito de baterías) -----

export interface CascoPendiente {
  id: string;
  folio: string | null;
  producto: string | null;
  sucursal: string | null;
  comision_cobrada: number;
  fecha_limite: string;
  estado: 'pendiente' | 'resuelto' | 'vencido';
  monto_devuelto: number;
  nombre_cliente: string | null;
  telefono_cliente: string | null;
  notas: string | null;
  resuelto_por: string | null;
  resuelto_en: string | null;
  created_at: string;
}

export interface ResolverCascoInput {
  monto_devuelto: number;
  casco_producto_id?: string;
  notas?: string;
}

export function listarCascosPendientes() {
  return api<CascoPendiente[]>('/admin/cascos-pendientes');
}

export function resolverCasco(id: string, input: ResolverCascoInput) {
  return api<unknown>(`/admin/cascos-pendientes/${id}/resolver`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
