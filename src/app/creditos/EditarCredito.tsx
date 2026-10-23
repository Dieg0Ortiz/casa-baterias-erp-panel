'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { type CreditoVenta, editarVentaCredito } from '@/lib/admin';
import { type Producto, formatearDinero } from '@/lib/catalogo';
import { IconEdit, IconPlus } from '@/components/Icons';
import { Modal } from './Modal';
import styles from './creditos.module.css';

interface Linea {
  clave: number;
  productoId: string;
  cantidad: string;
  precio: string;
  /** Solo para modelos que requieren casco. */
  conCasco: boolean;
}

function nombreProducto(p: Producto): string {
  return p.marcas?.nombre ? `${p.marcas.nombre} ${p.modelo}` : p.modelo;
}

/**
 * Corrige cantidades o modelos de una venta a crédito. Las piezas anteriores
 * regresan al inventario de la sucursal y se toman las nuevas; el saldo se
 * recalcula respetando lo que la empresa ya abonó. El folio no cambia.
 */
export function EditarCredito({
  credito,
  productos,
  onCerrar,
  onGuardado,
}: {
  credito: CreditoVenta;
  productos: Producto[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const renglonesActuales = useMemo(() => credito.venta?.venta_items ?? [], [credito]);
  const [lineas, setLineas] = useState<Linea[]>(() =>
    renglonesActuales.map((vi, i) => ({
      clave: i,
      productoId: vi.producto?.id ?? '',
      cantidad: String(vi.cantidad),
      precio: String(vi.precio_unitario),
      conCasco: vi.con_casco !== false,
    })),
  );
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const sucursalId = credito.sucursal?.id;
  const abonado = credito.monto_total - credito.saldo_pendiente;

  // Las piezas de la venta regresan antes de tomar las nuevas: cuentan como disponibles.
  const piezasEnVenta = useMemo(() => {
    const m = new Map<string, number>();
    for (const vi of renglonesActuales) {
      if (vi.producto?.id) m.set(vi.producto.id, (m.get(vi.producto.id) ?? 0) + vi.cantidad);
    }
    return m;
  }, [renglonesActuales]);

  function disponibles(productoId: string): number {
    const p = porId.get(productoId);
    const enSucursal = p?.inventario?.find((i) => i.sucursal_id === sucursalId)?.cantidad ?? 0;
    return enSucursal + (piezasEnVenta.get(productoId) ?? 0);
  }

  const opciones = useMemo(
    () =>
      productos
        .filter((p) => p.activo || piezasEnVenta.has(p.id))
        .sort((a, b) => nombreProducto(a).localeCompare(nombreProducto(b), 'es', { numeric: true })),
    [productos, piezasEnVenta],
  );

  const total = lineas.reduce((s, l) => {
    const p = porId.get(l.productoId);
    const cantidad = Number(l.cantidad) || 0;
    const precio = Number(l.precio) || 0;
    const deposito = p?.requiere_casco && !l.conCasco ? (p.comision_casco ?? 0) : 0;
    return s + (precio + deposito) * cantidad;
  }, 0);
  const saldoNuevo = total - abonado;

  function cambiar(clave: number, cambios: Partial<Linea>) {
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  }

  function elegirProducto(clave: number, productoId: string) {
    const p = porId.get(productoId);
    cambiar(clave, { productoId, precio: p ? String(p.precio) : '', conCasco: true });
  }

  function agregar() {
    setLineas((ls) => [
      ...ls,
      { clave: Math.max(-1, ...ls.map((l) => l.clave)) + 1, productoId: '', cantidad: '1', precio: '', conCasco: true },
    ]);
  }

  function validar(): string | null {
    if (lineas.length === 0) return 'La venta debe conservar al menos una pieza. Para quitarla completa, cancélala.';
    for (const l of lineas) {
      const p = porId.get(l.productoId);
      if (!p) return 'Elige el modelo de cada renglón.';
      if (!Number.isInteger(Number(l.cantidad)) || Number(l.cantidad) < 1) {
        return `Cantidad inválida para ${nombreProducto(p)}.`;
      }
      if (l.precio === '' || Number(l.precio) < 0) return `Precio inválido para ${nombreProducto(p)}.`;
    }
    const pedidas = new Map<string, number>();
    for (const l of lineas) pedidas.set(l.productoId, (pedidas.get(l.productoId) ?? 0) + Number(l.cantidad));
    for (const [id, n] of pedidas) {
      if (n > disponibles(id)) {
        return `Solo hay ${disponibles(id)} pieza(s) de ${nombreProducto(porId.get(id)!)} en la sucursal.`;
      }
    }
    if (saldoNuevo < -0.005) {
      return `La empresa ya abonó ${formatearDinero(abonado)}; el nuevo total no puede ser menor.`;
    }
    if (motivo.trim().length < 4) return 'Escribe el motivo de la corrección.';
    return null;
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await editarVentaCredito(credito.id, {
        motivo: motivo.trim(),
        items: lineas.map((l) => ({
          producto_id: l.productoId,
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio),
          ...(porId.get(l.productoId)?.requiere_casco ? { con_casco: l.conCasco } : {}),
        })),
      });
      onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la corrección.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={`Corregir venta a crédito ${credito.venta?.folio ?? ''}`}
      icono={<IconEdit style={{ color: 'var(--primary)' }} />}
      onCerrar={onCerrar}
      maxWidth="860px"
    >
      <form onSubmit={guardar}>
        <div className={styles.modalBody}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {credito.empresa?.nombre} · {credito.sucursal?.nombre}. Las piezas que quites regresan al
            inventario de la sucursal y las que agregues se descuentan. El folio no cambia y la corrección
            queda registrada.
          </div>

          {error && (
            <div className={`${styles.alertBox} ${styles.alertError}`}>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '42%' }}>Modelo</th>
                  <th style={{ width: '12%' }}>Cantidad</th>
                  <th style={{ width: '16%' }}>Precio unitario</th>
                  <th style={{ width: '16%' }}>Casco</th>
                  <th style={{ width: '14%' }} />
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => {
                  const p = porId.get(l.productoId);
                  return (
                    <tr key={l.clave}>
                      <td>
                        <select
                          className={styles.select}
                          value={l.productoId}
                          onChange={(e) => elegirProducto(l.clave, e.target.value)}
                        >
                          <option value="">Elige un modelo…</option>
                          {opciones.map((o) => (
                            <option key={o.id} value={o.id}>
                              {nombreProducto(o)} (disp. {disponibles(o.id)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          type="number"
                          min="1"
                          step="1"
                          value={l.cantidad}
                          onChange={(e) => cambiar(l.clave, { cantidad: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.precio}
                          onChange={(e) => cambiar(l.clave, { precio: e.target.value })}
                        />
                      </td>
                      <td>
                        {p?.requiere_casco ? (
                          <select
                            className={styles.select}
                            value={l.conCasco ? 'con' : 'sin'}
                            onChange={(e) => cambiar(l.clave, { conCasco: e.target.value === 'con' })}
                          >
                            <option value="con">Con casco</option>
                            <option value="sin">
                              Sin casco (+{formatearDinero(p.comision_casco ?? 0)})
                            </option>
                          </select>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <button type="button" className={styles.btnSecondary} onClick={agregar}>
              <IconPlus />
              <span>Agregar modelo</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              padding: 14,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <Dato etiqueta="Total anterior" valor={formatearDinero(credito.monto_total)} />
            <Dato etiqueta="Ya abonado" valor={formatearDinero(abonado)} />
            <Dato etiqueta="Total corregido" valor={formatearDinero(total)} fuerte />
            <Dato
              etiqueta="Saldo nuevo"
              valor={formatearDinero(Math.max(saldoNuevo, 0))}
              fuerte
              color={saldoNuevo < -0.005 ? 'var(--error)' : 'var(--primary)'}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Motivo de la corrección *</label>
            <input
              className={styles.input}
              type="text"
              maxLength={200}
              placeholder="Ej. El vale decía 2 piezas del modelo 47, no 3"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimary} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar corrección'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Dato({ etiqueta, valor, fuerte, color }: { etiqueta: string; valor: string; fuerte?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{etiqueta}</div>
      <div className="mono" style={{ fontSize: fuerte ? '1.125rem' : '1rem', fontWeight: fuerte ? 700 : 500, color }}>
        {valor}
      </div>
    </div>
  );
}
