/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './api';

// Tipos del dashboard consolidado (Fase 8).
export interface CajaSucursal {
  corte_id: string;
  usuario_id: string;
  monto_inicial: number;
  total_ventas: number;
  /** Efectivo que debe haber en el cajón (sin tarjetas ni transferencias). */
  monto_esperado: number;
  total_tarjetas?: number;
  total_transferencias?: number;
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
  marca?: string | null;
  modelo?: string | null;
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

/** Montos por forma de pago; el pago mixto ya viene repartido. */
export interface TotalesPorGrupo {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  /** Vendido a crédito: no se cobró, no entra a ningún corte. */
  credito: number;
  /** efectivo + tarjeta + transferencia */
  cobrado: number;
}

export interface ReporteVentas {
  ventas: VentaReporte[];
  totales: {
    ventas: number;
    monto: number;
    unidades: number;
    por_grupo?: TotalesPorGrupo;
  };
}

export type GrupoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';

export function grupoDeMetodo(metodo: string | null | undefined): GrupoPago {
  switch ((metodo ?? 'efectivo').toLowerCase()) {
    case 'tarjeta':
    case 'tarjeta_debito':
    case 'tarjeta_credito':
      return 'tarjeta';
    case 'transferencia':
      return 'transferencia';
    case 'credito':
      return 'credito';
    default:
      return 'efectivo';
  }
}

export function etiquetaMetodoPago(metodo: string | null | undefined): string {
  switch ((metodo ?? 'efectivo').toLowerCase()) {
    case 'tarjeta_debito':
      return 'Tarjeta de débito';
    case 'tarjeta_credito':
      return 'Tarjeta de crédito';
    case 'tarjeta':
      return 'Tarjeta';
    case 'transferencia':
      return 'Transferencia';
    case 'mixto':
      return 'Pago mixto';
    case 'credito':
      return 'Crédito a empresa';
    case 'cheque':
      return 'Cheque';
    default:
      return 'Efectivo';
  }
}

/**
 * Totales por forma de pago de una lista de ventas. Lo calcula el API; esto
 * es el respaldo para un API que todavía no manda `por_grupo`.
 */
export function totalesPorGrupo(ventas: VentaReporte[]): TotalesPorGrupo {
  const t: TotalesPorGrupo = { efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0, cobrado: 0 };
  for (const v of ventas) {
    const partes =
      (v.metodo_pago ?? '').toLowerCase() === 'mixto' && v.desglose_pago?.length
        ? v.desglose_pago.map((p) => ({ metodo: p.metodo, monto: Number(p.monto) }))
        : [{ metodo: v.metodo_pago, monto: Number(v.total) }];
    for (const p of partes) t[grupoDeMetodo(p.metodo)] += p.monto;
  }
  t.cobrado = t.efectivo + t.tarjeta + t.transferencia;
  return t;
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
  /** Clave corta que va en sus folios: NV-MAT-000124. */
  clave?: string;
  es_matriz: boolean;
  direccion?: string | null;
  /** Texto al pie del ticket del cliente (garantía). Null: no se imprime. */
  leyenda_ticket?: string | null;
  activo?: boolean;
  empleados_count?: number;
  created_at?: string;
}

export interface CrearSucursalInput {
  nombre: string;
  es_matriz?: boolean;
  direccion?: string;
  clave?: string;
  leyenda_ticket?: string;
}

export interface ActualizarSucursalInput {
  nombre?: string;
  es_matriz?: boolean;
  direccion?: string;
  clave?: string;
  /** Vacío la borra. */
  leyenda_ticket?: string;
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

export function crearSucursal(input: CrearSucursalInput) {
  return api<SucursalItem>('/admin/sucursales', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function actualizarSucursal(id: string, input: ActualizarSucursalInput) {
  return api<SucursalItem>(`/admin/sucursales/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
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

export type OrigenAlta = 'entrada' | 'carga_masiva' | 'compra' | 'catalogo';

export interface LineaAlta {
  folio: string;
  origen: OrigenAlta;
  modo: 'sumar' | 'reemplazar';
  cantidad: number;
  existencia_anterior: number | null;
  existencia_nueva: number | null;
  nota: string | null;
  referencia: string | null;
  created_at: string;
  sucursal: string | null;
  usuario: string | null;
  marca: string | null;
  modelo: string | null;
  codigo_barras: string | null;
}

export interface ReporteAltas {
  lineas: LineaAlta[];
  totales: { operaciones: number; lineas: number; unidades: number };
}

export function etiquetaOrigenAlta(origen: string, modo: string): string {
  if (origen === 'catalogo') return 'Alta de modelo';
  if (origen === 'compra') return 'Compra';
  if (origen === 'carga_masiva' && modo === 'reemplazar') return 'Conteo';
  if (origen === 'carga_masiva') return 'Carga masiva';
  return 'Entrada de inventario';
}

export function obtenerReporteAltas(filtros: {
  sucursal_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  producto_id?: string;
  origen?: OrigenAlta | '';
}) {
  const params = new URLSearchParams();
  if (filtros.sucursal_id) params.set('sucursal_id', filtros.sucursal_id);
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
  if (filtros.producto_id) params.set('producto_id', filtros.producto_id);
  if (filtros.origen) params.set('origen', filtros.origen);
  const q = params.toString();
  return api<ReporteAltas>(`/admin/reportes/altas${q ? `?${q}` : ''}`);
}

export interface ReimpresionTicket {
  id: string;
  folio: string;
  numero: number;
  motivo: string;
  created_at: string;
  sucursal: string | null;
  solicito: string | null;
  autorizo: string | null;
  total: number;
  vendida_en: string | null;
}

export interface ReporteReimpresiones {
  reimpresiones: ReimpresionTicket[];
  totales: { reimpresiones: number };
}

export function obtenerReporteReimpresiones(filtros: {
  fecha_desde?: string;
  fecha_hasta?: string;
  sucursal_id?: string;
}) {
  const params = new URLSearchParams();
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
  if (filtros.sucursal_id) params.set('sucursal_id', filtros.sucursal_id);
  const q = params.toString();
  return api<ReporteReimpresiones>(`/admin/reportes/reimpresiones${q ? `?${q}` : ''}`);
}

// ----- Cancelaciones de tickets -----

export interface CancelacionTicket {
  id: string;
  folio: string;
  total: number;
  metodo_pago: string;
  vendida_en: string;
  cancelada_en: string | null;
  motivo: string | null;
  sucursal: string | null;
  solicito: string | null;
  autorizo: string | null;
}

export interface ReporteCancelaciones {
  cancelaciones: CancelacionTicket[];
  totales: { cancelaciones: number; monto: number };
}

export function obtenerReporteCancelaciones(filtros: {
  fecha_desde?: string;
  fecha_hasta?: string;
  sucursal_id?: string;
}) {
  const params = new URLSearchParams();
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
  if (filtros.sucursal_id) params.set('sucursal_id', filtros.sucursal_id);
  const q = params.toString();
  return api<ReporteCancelaciones>(`/admin/reportes/cancelaciones${q ? `?${q}` : ''}`);
}

/**
 * Cancela un ticket: regresa piezas y cascos y lo saca del corte. Solo
 * mientras el corte de la venta siga abierto; después es una devolución.
 */
export function cancelarVenta(ventaId: string, motivo: string) {
  return api<{ folio: string; total: number }>(`/sales/${ventaId}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

// ----- Autorizaciones a distancia -----
// La caja pide reimprimir, cancelar o devolver una batería y el
// administrador aprueba desde aquí. Aprobar ejecuta la acción.

export type TipoSolicitud = 'reimpresion' | 'cancelacion' | 'devolucion_bateria';
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada' | 'retirada';

export interface SolicitudAutorizacion {
  id: string;
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  folio: string;
  motivo: string;
  created_at: string;
  expira_en: string;
  resuelto_en: string | null;
  nota_resolucion: string | null;
  impresa_en: string | null;
  sucursal: string | null;
  solicitante: string | null;
  autorizador: string | null;
  venta: {
    total: number;
    metodo_pago: string;
    created_at: string;
    articulos: { cantidad: number; producto: string; precio_unitario: number }[];
  } | null;
  devolucion: {
    metodo: string;
    cliente_nombre: string | null;
    total: number;
    piezas: { cantidad: number; producto: string; monto: number; reingresa_inventario: boolean }[];
  } | null;
  resultado: Record<string, unknown> | null;
}

/** Pendientes: todas las que esperan. Sin estado: las de hoy. */
export function listarAutorizaciones(estado?: EstadoSolicitud) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  const qs = params.toString();
  return api<SolicitudAutorizacion[]>(`/autorizaciones${qs ? `?${qs}` : ''}`);
}

export function contarAutorizacionesPendientes() {
  return api<{ total: number }>('/autorizaciones/pendientes');
}

export function aprobarAutorizacion(id: string, nota?: string) {
  return api<SolicitudAutorizacion>(`/autorizaciones/${id}/aprobar`, {
    method: 'POST',
    body: JSON.stringify(nota ? { nota } : {}),
  });
}

export function rechazarAutorizacion(id: string, nota?: string) {
  return api<SolicitudAutorizacion>(`/autorizaciones/${id}/rechazar`, {
    method: 'POST',
    body: JSON.stringify(nota ? { nota } : {}),
  });
}

// ----- Devoluciones (folio DEV) -----

export interface DevolucionLista {
  id: string;
  folio: string;
  tipo: 'deposito_casco' | 'bateria';
  monto: number;
  metodo_reembolso: string;
  motivo: string;
  cliente_nombre: string | null;
  created_at: string;
  sucursal: string | null;
  venta_folio: string | null;
  atendio: string | null;
  autorizo: string | null;
  items: Array<{
    marca: string | null;
    modelo: string | null;
    cantidad: number;
    monto: number;
    reingresa_inventario: boolean;
  }>;
}

export interface ReporteDevoluciones {
  devoluciones: DevolucionLista[];
  totales: { devoluciones: number; monto: number; depositos: number; baterias: number };
}

export function etiquetaTipoDevolucion(tipo: string): string {
  return tipo === 'deposito_casco' ? 'Depósito de casco' : 'Batería devuelta';
}

export function obtenerReporteDevoluciones(filtros: {
  fecha_desde?: string;
  fecha_hasta?: string;
  sucursal_id?: string;
}) {
  const params = new URLSearchParams();
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
  if (filtros.sucursal_id) params.set('sucursal_id', filtros.sucursal_id);
  const q = params.toString();
  return api<ReporteDevoluciones>(`/devoluciones${q ? `?${q}` : ''}`);
}

// ----- Cortes de caja (efectivo y electrónico por separado) -----

export interface CorteCaja {
  id: string;
  sucursal_id: string;
  usuario_id: string;
  monto_inicial: number;
  monto_final_reportado: number | null;
  /** Efectivo esperado en el cajón al cerrar. */
  monto_calculado: number | null;
  diferencia: number | null;
  total_tarjetas: number | null;
  total_transferencias: number | null;
  estado: 'abierto' | 'cerrado';
  abierto_en: string;
  cerrado_en: string | null;
}

export interface OperacionCorte {
  origen: 'venta' | 'intercambio' | 'abono_credito' | 'devolucion';
  folio: string | null;
  detalle: string | null;
  metodo: string;
  monto: number;
  creado_en: string;
}

export interface ResumenCorte {
  corte_id: string;
  estado: 'abierto' | 'cerrado';
  sucursal: string | null;
  abierto_en: string;
  cerrado_en: string | null;
  abrio: string | null;
  cerro: string | null;
  efectivo: {
    monto_inicial: number;
    ventas: number;
    ventas_count: number;
    intercambios: number;
    abonos_credito: number;
    devoluciones: number;
    esperado: number;
    contado: number | null;
    diferencia: number | null;
  };
  electronico: {
    tarjeta_debito: number;
    tarjeta_credito: number;
    tarjeta_sin_tipo: number;
    devoluciones_tarjeta: number;
    total_tarjetas: number;
    transferencias: number;
    devoluciones_transferencia: number;
    total_transferencias: number;
    total: number;
    operaciones: OperacionCorte[];
  };
  otros: { total: number; operaciones: OperacionCorte[] };
  creditos: {
    ventas_count: number;
    total: number;
    piezas: number;
    ventas: Array<{
      folio: string;
      empresa: string;
      total: number;
      piezas: number;
      folio_vale: string | null;
      creado_en: string;
    }>;
  };
  devoluciones: {
    count: number;
    total: number;
    lista: Array<{
      folio: string;
      tipo: string;
      monto: number;
      metodo: string;
      venta_folio: string;
      creado_en: string;
    }>;
  };
  cancelaciones: {
    count: number;
    total: number;
    lista: Array<{ folio: string; total: number; motivo: string | null }>;
  };
}

export function listarCortes(sucursalId?: string) {
  const params = new URLSearchParams({ limite: '120' });
  if (sucursalId) params.set('sucursal_id', sucursalId);
  return api<CorteCaja[]>(`/cash?${params.toString()}`);
}

export function obtenerResumenCorte(corteId: string) {
  return api<ResumenCorte>(`/cash/${corteId}/resumen`);
}

export interface UtilidadReporte {
  totalVentas: number;
  totalCosto: number;
  totalUtilidad: number;
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
  estado: 'pendiente' | 'resuelto' | 'vencido' | 'cancelado';
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

export interface MovimientoCasco {
  id: string;
  sucursal_id: string;
  producto_id: string;
  tipo: 'alta' | 'baja_proveedor';
  cantidad: number;
  nota: string | null;
  created_at: string;
  sucursales?: { nombre: string } | null;
  productos?: { modelo: string; marcas?: { nombre: string } | null } | null;
  usuarios?: { nombre_completo: string } | null;
}

export function listarMovimientosCascos() {
  return api<MovimientoCasco[]>('/cascos/bodega/movimientos');
}

export function bajarCascosGrupo(input: {
  sucursal_id: string;
  items: { producto_id: string; cantidad: number }[];
  nota?: string;
}) {
  return api<{ piezas: number }>('/cascos/bodega/grupo', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function ajustarCascoBodega(input: {
  producto_id: string;
  sucursal_id: string;
  cantidad: number;
  tipo: 'alta' | 'baja_proveedor';
  nota?: string;
}) {
  return api<unknown>('/cascos/bodega', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function registrarIntercambioCasco(input: RegistrarIntercambioInput) {
  return api<any>('/cascos/intercambios', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ==========================================
// Módulo de Créditos Empresariales
// ==========================================

export interface PiezasDeModelo {
  marca: string | null;
  modelo: string | null;
  cantidad: number;
}

export interface EmpresaCredito {
  id: string;
  nombre: string;
  rfc: string | null;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  limite_credito: number;
  dias_credito: number;
  activo: boolean;
  saldo_deudor?: number;
  total_baterias_debidas?: number;
  /** Pilas en ventas a crédito abiertas, sumadas por modelo. */
  baterias_por_modelo?: PiezasDeModelo[];
  tiene_vencidas?: boolean;
  ventas_pendientes_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreditoVenta {
  id: string;
  monto_total: number;
  saldo_pendiente: number;
  fecha_vencimiento: string;
  recibido_por: string | null;
  vehiculo_placas: string | null;
  folio_vale: string | null;
  estado: 'pendiente' | 'parcial' | 'pagado' | 'vencido' | 'cancelado';
  created_at: string;
  es_vencida?: boolean;
  empresa?: {
    id: string;
    nombre: string;
    rfc: string | null;
    telefono: string | null;
    dias_credito: number;
  };
  sucursal?: {
    id: string;
    nombre: string;
  };
  venta?: {
    id: string;
    folio: string;
    created_at: string;
    total: number;
    usuario?: { id: string; nombre: string; email?: string };
    venta_items?: Array<{
      id: string;
      cantidad: number;
      precio_unitario: number;
      con_casco: boolean | null;
      comision_casco?: number | null;
      producto?: {
        id: string;
        modelo: string;
        marca: string;
        requiere_casco?: boolean;
        comision_casco?: number | null;
        precio?: number;
      };
    }>;
  };
}

export interface EdicionCredito {
  id: string;
  credito_venta_id: string;
  motivo: string;
  antes: RenglonEditado[];
  despues: RenglonEditado[];
  total_anterior: number;
  total_nuevo: number;
  created_at: string;
  usuario: string | null;
}

export interface RenglonEditado {
  marca: string | null;
  modelo: string;
  cantidad: number;
  precio_unitario: number;
  con_casco: boolean | null;
}

export interface RenglonCreditoInput {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  con_casco?: boolean;
}

/** Reemplaza las piezas de una venta a crédito por la lista corregida. */
export function editarVentaCredito(
  creditoVentaId: string,
  input: { items: RenglonCreditoInput[]; motivo: string },
) {
  return api<{ total_nuevo: number; saldo_pendiente: number }>(
    `/creditos/ventas/${creditoVentaId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export interface ReporteCreditosDia {
  fecha: string;
  creditos: Array<{
    id: string;
    folio: string | null;
    empresa: string | null;
    sucursal: string | null;
    atendio: string | null;
    folio_vale: string | null;
    recibido_por: string | null;
    vehiculo_placas: string | null;
    total: number;
    saldo_pendiente: number;
    estado: string;
    piezas: number;
    items: Array<{
      marca: string | null;
      modelo: string | null;
      cantidad: number;
      precio_unitario: number;
      con_casco: boolean | null;
    }>;
    created_at: string;
  }>;
  abonos: Array<{
    id: string;
    empresa: string | null;
    sucursal: string | null;
    usuario: string | null;
    monto: number;
    metodo_pago: string;
    referencia: string | null;
    created_at: string;
  }>;
  traspasos: Array<{
    id: string;
    marca: string | null;
    modelo: string | null;
    cantidad: number;
    origen: string | null;
    destino: string | null;
    autorizo: string | null;
    nota: string | null;
    created_at: string;
  }>;
  totales: {
    creditos: number;
    monto_creditos: number;
    piezas_credito: number;
    abonos: number;
    monto_abonos: number;
    traspasos: number;
    piezas_traspasadas: number;
  };
}

export function obtenerReporteCreditosDia(fecha: string, sucursalId?: string) {
  const params = new URLSearchParams({ fecha });
  if (sucursalId) params.set('sucursal_id', sucursalId);
  return api<ReporteCreditosDia>(`/creditos/reporte-dia?${params.toString()}`);
}

export interface CreditoAbono {
  id: string;
  monto: number;
  metodo_pago: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta';
  referencia: string | null;
  notas: string | null;
  created_at: string;
  usuario?: { id: string; nombre: string };
  sucursal?: { id: string; nombre: string };
}

export interface EstadoCuentaEmpresa {
  empresa: EmpresaCredito;
  saldo_deudor: number;
  baterias_por_modelo?: PiezasDeModelo[];
  ventas: CreditoVenta[];
  abonos: CreditoAbono[];
  ediciones?: EdicionCredito[];
}

export interface CrearEmpresaCreditoInput {
  nombre: string;
  rfc?: string;
  contacto_nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  limite_credito?: number;
  dias_credito?: number;
  activo?: boolean;
}

export interface ActualizarEmpresaCreditoInput {
  nombre?: string;
  rfc?: string;
  contacto_nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  limite_credito?: number;
  dias_credito?: number;
  activo?: boolean;
}

export interface RegistrarAbonoCreditoInput {
  empresa_id: string;
  monto: number;
  metodo_pago?: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta';
  credito_venta_id?: string;
  sucursal_id?: string;
  referencia?: string;
  notas?: string;
}

export function listarEmpresasCredito(soloActivas: boolean = false) {
  return api<EmpresaCredito[]>(`/creditos/empresas${soloActivas ? '?activas=true' : ''}`);
}

export function crearEmpresaCredito(input: CrearEmpresaCreditoInput) {
  return api<EmpresaCredito>('/creditos/empresas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function actualizarEmpresaCredito(id: string, input: ActualizarEmpresaCreditoInput) {
  return api<EmpresaCredito>(`/creditos/empresas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function obtenerEstadoCuentaEmpresa(id: string) {
  return api<EstadoCuentaEmpresa>(`/creditos/empresas/${id}/estado-cuenta`);
}

export function listarVentasCredito(estado?: string, sucursalId?: string) {
  const params = new URLSearchParams();
  if (estado) params.append('estado', estado);
  if (sucursalId) params.append('sucursal_id', sucursalId);
  const q = params.toString();
  return api<CreditoVenta[]>(`/creditos/ventas${q ? `?${q}` : ''}`);
}

export function registrarAbonoCredito(input: RegistrarAbonoCreditoInput) {
  return api<any>('/creditos/abonos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

