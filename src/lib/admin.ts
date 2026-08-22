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

export interface PagoParcial {
  metodo: string;
  monto: number;
  referencia?: string;
}

export interface VentaFeed {
  id: string;
  folio: string;
  total: number;
  sucursal: string | null;
  usuario: string | null;
  created_at: string;
  metodo_pago: string | null;
  desglose_pago?: PagoParcial[] | null;
}

export interface Dashboard {
  fecha: string;
  resumen: ResumenGeneral;
  por_sucursal: SucursalResumen[];
  ultimas_ventas: VentaFeed[];
}

export interface ItemVentaReporte {
  producto: string | null;
  cantidad: number;
  precio_unitario: number;
  tipo_precio?: string | null;
  con_casco?: boolean | null;
  comision_casco?: number | null;
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
  desglose_pago?: PagoParcial[] | null;
  items: ItemVentaReporte[];
}

export interface ReporteVentas {
  ventas: VentaReporte[];
  totales: { ventas: number; monto: number; unidades: number };
}

export interface Empleado {
  id: string;
  email?: string | null;
  nombre_completo: string;
  rol: 'administrador' | 'trabajador';
  sucursal_id: string | null;
  sucursal?: string | null;
  activo: boolean;
  created_at?: string | null;
}

export interface SucursalItem {
  id: string;
  nombre: string;
  es_matriz: boolean;
  activo?: boolean;
}

export interface CrearUsuarioInput {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol?: 'administrador' | 'trabajador';
  sucursal_id?: string;
}

export interface ActualizarUsuarioInput {
  nombre?: string;
  apellido?: string;
  rol?: 'administrador' | 'trabajador';
  sucursal_id?: string | null;
  activo?: boolean;
  password?: string;
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

export function listarSucursales() {
  return api<SucursalItem[]>('/admin/sucursales');
}

export function crearUsuario(input: CrearUsuarioInput) {
  return api<Empleado>('/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function actualizarUsuario(id: string, input: ActualizarUsuarioInput) {
  return api<{ success: boolean }>(`/admin/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
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

export interface UtilidadReporte {
  totalVentas: number;
  totalCosto: number;
  totalUtilidad: number;
  items: any[];
}

export function obtenerReporteUtilidades(fechaInicio?: string, fechaFin?: string) {
  const params = new URLSearchParams();
  if (fechaInicio) params.set('fechaInicio', fechaInicio);
  if (fechaFin) params.set('fechaFin', fechaFin);
  const q = params.toString();
  return api<UtilidadReporte>(`/reports/utilidades${q ? `?${q}` : ''}`);
}

// ----- Cascos Pendientes (sistema de comisión por depósito de baterías) -----

export interface CascoPendiente {
  id: string;
  folio: string | null;
  producto: string | null;
  casco_producto_id?: string | null;
  casco_recibido?: string | null;
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

// ----- Intercambios de Cascos (Trueque con cobro por servicio) -----

export interface IntercambioCascoItem {
  id: string;
  cantidad: number;
  precio_unitario: number;
  casco_saliente?: {
    id: string;
    modelo: string;
    descripcion: string;
    marcas?: { nombre: string };
  };
  casco_entrante?: {
    id: string;
    modelo: string;
    descripcion: string;
    marcas?: { nombre: string };
  };
}

export interface IntercambioCasco {
  id: string;
  folio: string;
  sucursal_id: string;
  usuario_id: string;
  monto_cobrado: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  notas: string | null;
  estado: 'completado' | 'cancelado';
  created_at: string;
  sucursales?: { id: string; nombre: string };
  usuarios?: { id: string; nombre_completo: string };
  intercambio_casco_items?: IntercambioCascoItem[];
}

export interface RegistrarIntercambioInput {
  sucursal_id: string;
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia';
  monto_cobrado?: number;
  cliente_nombre?: string;
  cliente_telefono?: string;
  notas?: string;
  items: Array<{
    casco_saliente_id: string;
    casco_entrante_id: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

export function listarIntercambiosCascos() {
  return api<IntercambioCasco[]>('/cascos/intercambios');
}

export function registrarIntercambioCasco(input: RegistrarIntercambioInput) {
  return api<any>('/cascos/intercambios', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

