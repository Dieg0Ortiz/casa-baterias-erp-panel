'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { obtenerReporteCreditosDia } from '@/lib/admin';
import { type Sucursal, listarSucursales } from '@/lib/catalogo';
import { generarCreditosTraspasosPdf } from '@/lib/generadorPdf';
import { IconDownload } from '@/components/Icons';
import { Modal } from './Modal';
import styles from './creditos.module.css';

function hoyLocal(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** PDF con las ventas a crédito, los abonos y los traspasos entre sucursales de un día. */
export function PdfDelDia({ onCerrar }: { onCerrar: () => void }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [fecha, setFecha] = useState(hoyLocal());
  const [sucursalId, setSucursalId] = useState('');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    listarSucursales()
      .then((s) => {
        if (activo) setSucursales(s);
      })
      .catch(() => {
        // Sin la lista se puede generar igual, para todas las sucursales.
      });
    return () => {
      activo = false;
    };
  }, []);

  async function generar(e: FormEvent) {
    e.preventDefault();
    setGenerando(true);
    setError(null);
    try {
      const reporte = await obtenerReporteCreditosDia(fecha, sucursalId || undefined);
      generarCreditosTraspasosPdf(reporte, sucursales.find((s) => s.id === sucursalId)?.nombre);
      onCerrar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Modal
      titulo="PDF de créditos y traspasos del día"
      icono={<IconDownload style={{ color: 'var(--primary)' }} />}
      onCerrar={onCerrar}
      maxWidth="480px"
    >
      <form onSubmit={generar}>
        <div className={styles.modalBody}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Incluye las ventas a crédito con sus pilas, los abonos recibidos y los traspasos de
            inventario entre sucursales de ese día.
          </div>
          {error && (
            <div className={`${styles.alertBox} ${styles.alertError}`}>
              <span>{error}</span>
            </div>
          )}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Fecha</label>
              <input
                className={styles.input}
                type="date"
                value={fecha}
                max={hoyLocal()}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Sucursal</label>
              <select className={styles.select} value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
                <option value="">Todas</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimary} disabled={generando || !fecha}>
            {generando ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
