/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSesion, logout } from '@/lib/auth';
import {
  aprobarAutorizacion,
  etiquetaMetodoPago,
  listarAutorizaciones,
  rechazarAutorizacion,
  type SolicitudAutorizacion,
  type TipoSolicitud,
} from '@/lib/admin';
import { ApiError } from '@/lib/api';
import { formatearDinero } from '@/lib/catalogo';
import { IconMenu, IconRefresh } from '@/components/Icons';
import { EVENTO_AUTORIZACIONES, Sidebar } from '@/components/Sidebar';
import styles from './autorizaciones.module.css';

type Vista = 'pendientes' | 'hoy';

const TITULO: Record<TipoSolicitud, string> = {
  reimpresion: 'Reimprimir ticket',
  cancelacion: 'Cancelar ticket',
  devolucion_bateria: 'Devolver batería',
};

const ESTADO: Record<SolicitudAutorizacion['estado'], string> = {
  pendiente: 'Por autorizar',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  retirada: 'Retirada por la caja',
};

/** Qué pasa si el administrador aprueba, dicho antes de aprobar. */
function efectoDeAprobar(s: SolicitudAutorizacion): string {
  if (s.tipo === 'reimpresion') {
    return 'La caja podrá imprimir una vez el ticket, marcado como reimpresión. No se cobra de nuevo.';
  }
  if (s.tipo === 'cancelacion') {
    return 'Se cancela la venta, las pilas regresan al inventario y el dinero sale del corte de hoy.';
  }
  const d = s.devolucion;
  const danadas = d?.piezas.some((p) => !p.reingresa_inventario);
  return `Se entregan ${formatearDinero(d?.total ?? 0)} (${etiquetaMetodoPago(d?.metodo)}) de la caja abierta. ${
    danadas
      ? 'Las pilas dañadas no regresan al inventario.'
      : 'Las pilas regresan al inventario.'
  }`;
}

function hora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function haceCuanto(iso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas} h ${minutos % 60} min`;
}

export default function AutorizacionesPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();
  const esAdmin = perfil?.rol === 'administrador';
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [vista, setVista] = useState<Vista>('pendientes');
  const [solicitudes, setSolicitudes] = useState<SolicitudAutorizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!autenticado || !esAdmin) return;
      if (!silencioso) setCargando(true);
      try {
        const lista = await listarAutorizaciones(vista === 'pendientes' ? 'pendiente' : undefined);
        setSolicitudes(lista);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las solicitudes');
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    [autenticado, esAdmin, vista],
  );

  // La caja está esperando: se revisa seguido sin parpadear la pantalla.
  useEffect(() => {
    void cargar();
    const intervalo = window.setInterval(() => void cargar(true), 15_000);
    return () => window.clearInterval(intervalo);
  }, [cargar]);

  async function resolver(s: SolicitudAutorizacion, aprobar: boolean, nota?: string) {
    try {
      const r = aprobar ? await aprobarAutorizacion(s.id, nota) : await rechazarAutorizacion(s.id, nota);
      const folioDev = typeof r.resultado?.folio === 'string' && r.tipo === 'devolucion_bateria'
        ? ` Folio de la devolución: ${r.resultado.folio}.`
        : '';
      setAviso(
        aprobar
          ? `${TITULO[s.tipo]} ${s.folio}: aprobado.${folioDev} La caja ya lo ve.`
          : `${TITULO[s.tipo]} ${s.folio}: rechazado. La caja ya lo ve.`,
      );
      window.dispatchEvent(new Event(EVENTO_AUTORIZACIONES));
      await cargar(true);
      return null;
    } catch (err) {
      await cargar(true);
      window.dispatchEvent(new Event(EVENTO_AUTORIZACIONES));
      return err instanceof ApiError ? err.message : 'No se pudo completar';
    }
  }

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  if (!autenticado) return null;

  if (!esAdmin) {
    return (
      <div className={styles.lockedPage}>
        <div className={styles.lockedCard}>
          <h1>Acceso restringido</h1>
          <p>Este panel es solo para administradores.</p>
          <button className={styles.btnPrimary} onClick={salir}>Salir</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar active="autorizaciones" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
              <IconMenu />
            </button>
            <div className={styles.breadcrumb}>
              <Link href="/" style={{ color: 'var(--text-muted)' }}>Panel</Link>
              <span>/</span>
              <span className={styles.breadcrumbActive}>Autorizaciones</span>
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          <p className={styles.intro}>
            Las cajas piden aquí reimprimir un ticket, cancelarlo o devolver una batería. Al aprobar, se
            hace en ese momento y la caja lo ve en su teléfono. Cada solicitud vence a las 12 horas.
          </p>

          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button className={styles.btnSecondary} onClick={() => void cargar()}>Reintentar</button>
            </div>
          )}
          {aviso && (
            <div className={styles.successBanner} role="status">
              <span>✓ {aviso}</span>
              <button className={styles.btnSecondary} onClick={() => setAviso(null)}>Cerrar</button>
            </div>
          )}

          <section className={styles.bentoCard}>
            <div className={styles.toolbar}>
              <div className={styles.filterGroup} role="tablist">
                <button
                  role="tab"
                  aria-selected={vista === 'pendientes'}
                  className={`${styles.filterBtn} ${vista === 'pendientes' ? styles.filterBtnActive : ''}`}
                  onClick={() => setVista('pendientes')}
                >
                  Por autorizar
                </button>
                <button
                  role="tab"
                  aria-selected={vista === 'hoy'}
                  className={`${styles.filterBtn} ${vista === 'hoy' ? styles.filterBtnActive : ''}`}
                  onClick={() => setVista('hoy')}
                >
                  Todas las de hoy
                </button>
              </div>
              <button className={styles.btnSecondary} onClick={() => void cargar()} disabled={cargando}>
                <IconRefresh style={{ width: 14, height: 14 }} />
                Actualizar
              </button>
            </div>

            <div className={styles.lista}>
              {cargando ? (
                <p className={styles.vacio}>Cargando…</p>
              ) : solicitudes.length === 0 ? (
                <p className={styles.vacio}>
                  {vista === 'pendientes'
                    ? 'No hay nada por autorizar. Esta página se actualiza sola.'
                    : 'Hoy no se ha pedido ninguna autorización.'}
                </p>
              ) : (
                solicitudes.map((s) => (
                  <TarjetaSolicitud key={s.id} solicitud={s} onResolver={resolver} />
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function TarjetaSolicitud({
  solicitud: s,
  onResolver,
}: {
  solicitud: SolicitudAutorizacion;
  onResolver: (s: SolicitudAutorizacion, aprobar: boolean, nota?: string) => Promise<string | null>;
}) {
  const [trabajando, setTrabajando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pendiente = s.estado === 'pendiente';

  async function ejecutar(aprobar: boolean) {
    setTrabajando(true);
    setError(null);
    const fallo = await onResolver(s, aprobar, aprobar ? undefined : nota.trim() || undefined);
    setTrabajando(false);
    if (fallo) setError(fallo);
  }

  return (
    <article className={`${styles.tarjeta} ${styles[`tipo_${s.tipo}`]}`}>
      <div className={styles.tarjetaCabecera}>
        <div>
          <div className={styles.tarjetaTitulo}>
            {TITULO[s.tipo]} <span className="mono">{s.folio}</span>
          </div>
          <div className={styles.tarjetaSub}>
            {s.sucursal ?? 'Sucursal'} · pidió {s.solicitante ?? 'la caja'} · {haceCuanto(s.created_at)}
          </div>
        </div>
        <span className={`${styles.estado} ${styles[`estado_${s.estado}`]}`}>{ESTADO[s.estado]}</span>
      </div>

      <div className={styles.motivo}>“{s.motivo}”</div>

      <div className={styles.columnas}>
        {s.venta && (
          <div>
            <div className={styles.subtitulo}>
              Venta de las {hora(s.venta.created_at)} · {etiquetaMetodoPago(s.venta.metodo_pago)}
            </div>
            <ul className={styles.renglones}>
              {s.venta.articulos.map((a, i) => (
                <li key={i}>
                  <span>{a.cantidad} × {a.producto}</span>
                  <span className="mono">{formatearDinero(a.cantidad * a.precio_unitario)}</span>
                </li>
              ))}
              <li className={styles.total}>
                <span>Total cobrado</span>
                <span className="mono">{formatearDinero(s.venta.total)}</span>
              </li>
            </ul>
          </div>
        )}

        {s.devolucion && (
          <div>
            <div className={styles.subtitulo}>
              Se devuelve · {etiquetaMetodoPago(s.devolucion.metodo)}
              {s.devolucion.cliente_nombre ? ` · ${s.devolucion.cliente_nombre}` : ''}
            </div>
            <ul className={styles.renglones}>
              {s.devolucion.piezas.map((p, i) => (
                <li key={i}>
                  <span>
                    {p.cantidad} × {p.producto}
                    {!p.reingresa_inventario && <em className={styles.danada}> dañada</em>}
                  </span>
                  <span className="mono">{formatearDinero(p.monto)}</span>
                </li>
              ))}
              <li className={styles.total}>
                <span>A entregar</span>
                <span className="mono">{formatearDinero(s.devolucion.total)}</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {pendiente ? (
        <>
          <p className={styles.efecto}>{efectoDeAprobar(s)}</p>
          {rechazando && (
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor={`nota-${s.id}`}>
                Motivo del rechazo (la caja lo verá)
              </label>
              <textarea
                id={`nota-${s.id}`}
                className={styles.textarea}
                maxLength={200}
                placeholder="Opcional"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </div>
          )}
          {error && <p className={styles.errorTexto} role="alert">{error}</p>}
          <div className={styles.acciones}>
            {rechazando ? (
              <>
                <button className={styles.btnSecondary} disabled={trabajando} onClick={() => setRechazando(false)}>
                  Volver
                </button>
                <button className={styles.btnRechazar} disabled={trabajando} onClick={() => void ejecutar(false)}>
                  {trabajando ? 'Rechazando…' : 'Confirmar rechazo'}
                </button>
              </>
            ) : (
              <>
                <button className={styles.btnSecondary} disabled={trabajando} onClick={() => setRechazando(true)}>
                  Rechazar
                </button>
                <button className={styles.btnPrimary} disabled={trabajando} onClick={() => void ejecutar(true)}>
                  {trabajando ? 'Aprobando…' : 'Aprobar'}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <p className={styles.efecto}>
          {s.estado === 'retirada'
            ? s.nota_resolucion ?? 'La caja la retiró.'
            : `${ESTADO[s.estado]} por ${s.autorizador ?? 'un administrador'} a las ${hora(s.resuelto_en)}.`}
          {s.estado === 'rechazada' && s.nota_resolucion ? ` “${s.nota_resolucion}”` : ''}
          {s.estado === 'aprobada' && s.tipo === 'devolucion_bateria' && typeof s.resultado?.folio === 'string'
            ? ` Folio ${s.resultado.folio}.`
            : ''}
          {s.estado === 'aprobada' && s.tipo === 'reimpresion'
            ? s.impresa_en
              ? ` Impresa a las ${hora(s.impresa_en)}.`
              : ' Falta que la caja la imprima.'
            : ''}
        </p>
      )}
    </article>
  );
}
