'use client';

import styles from './sucursales.module.css';

/** Mismo límite que la base (sucursales_leyenda_ticket_largo). */
export const LARGO_LEYENDA = 2000;

/**
 * El reverso de las notas de papel: requisitos de la garantía y centros de
 * servicio de los proveedores en Tuxtla. El administrador lo carga con un
 * botón y lo ajusta si hace falta.
 */
export const GARANTIA_NOTA = [
  'REQUISITOS DE GARANTÍA',
  '1. El acumulador debe ser revisado y evaluado por personal de la empresa.',
  '2. Los postes no deben venir golpeados o reparados.',
  '3. Que la batería no venga inflada.',
  '4. El acumulador no debe venir roto ni golpeado.',
  '5. No debe traer las tapas alteradas.',
  '6. No debe traer nivel bajo de electrolito.',
  '7. No debe traer exceso de electrolito.',
  '8. Presentar la nota y la póliza.',
  '',
  'CENTROS DE SERVICIO',
  'LTH, Óptima, América y Cronos: 5a. Norte entre 16a. y 17a. Poniente.',
  'Gonher y Voltar: Carret. Panamericana, Plan de Ayala.',
].join('\n');

interface Props {
  valor: string;
  onCambio: (valor: string) => void;
}

/** Texto que la sucursal imprime al pie del ticket del cliente. */
export default function LeyendaTicket({ valor, onCambio }: Props) {
  return (
    <div className={styles.field}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <label className={styles.fieldLabel} htmlFor="leyenda-ticket">
          Garantía al pie del ticket
        </label>
        <button
          type="button"
          className={styles.btnAction}
          onClick={() => onCambio(GARANTIA_NOTA)}
          title="Pone los requisitos de garantía y los centros de servicio de la nota de papel"
        >
          Usar el texto de la nota
        </button>
      </div>
      <textarea
        id="leyenda-ticket"
        className={`${styles.textarea} mono`}
        style={{ minHeight: '160px', fontSize: '12px' }}
        placeholder="Vacío: el ticket sale sin garantía."
        maxLength={LARGO_LEYENDA}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      />
      <span className={styles.helperText}>
        Sale en el papel del cliente y en las reimpresiones, no en el del comercio. Déjalo vacío
        en las sucursales donde no aplica. {valor.length}/{LARGO_LEYENDA}
      </span>
    </div>
  );
}
