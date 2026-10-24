import type { ComponentType, CSSProperties, SVGProps } from 'react';
import { IconBolt, IconBuilding, IconCard, IconCash, IconSplit } from '@/components/Icons';

interface Estilo {
  texto: string;
  color: string;
  /** Mismo color, con transparencia, para el fondo de la pastilla. */
  fondo: string;
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
}

const ESTILOS: Record<string, Estilo> = {
  efectivo: { texto: 'Efectivo', color: '#059669', fondo: 'rgba(5, 150, 105, 0.12)', Icono: IconCash },
  tarjeta_debito: { texto: 'T. Débito', color: '#0284c7', fondo: 'rgba(2, 132, 199, 0.12)', Icono: IconCard },
  tarjeta_credito: { texto: 'T. Crédito', color: '#9333ea', fondo: 'rgba(147, 51, 234, 0.12)', Icono: IconCard },
  tarjeta: { texto: 'Tarjeta', color: '#4f46e5', fondo: 'rgba(79, 70, 229, 0.12)', Icono: IconCard },
  transferencia: { texto: 'Transferencia', color: '#ea580c', fondo: 'rgba(234, 88, 12, 0.12)', Icono: IconBolt },
  mixto: { texto: 'Pago Mixto', color: '#d97706', fondo: 'rgba(217, 119, 6, 0.12)', Icono: IconSplit },
  credito: { texto: 'Crédito', color: '#0f766e', fondo: 'rgba(15, 118, 110, 0.12)', Icono: IconBuilding },
};

const PASTILLA: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

/** Forma de pago de una venta, con el mismo diseño de pastilla para todas. */
export function BadgeMetodoPago({ metodo }: { metodo: string | null | undefined }) {
  const estilo = ESTILOS[metodo ?? 'efectivo'] ?? ESTILOS.efectivo;
  const { Icono } = estilo;
  return (
    <span style={{ ...PASTILLA, color: estilo.color, background: estilo.fondo }}>
      <Icono style={{ width: '13px', height: '13px', color: estilo.color }} />
      <span>{estilo.texto}</span>
    </span>
  );
}
