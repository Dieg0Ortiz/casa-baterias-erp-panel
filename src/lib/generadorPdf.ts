/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  etiquetaMetodoPago,
  etiquetaOrigenAlta,
  grupoDeMetodo,
  totalesPorGrupo,
  type ReporteAltas,
  type ReporteCreditosDia,
  type ReporteVentas,
  type ResumenCorte,
  type VentaReporte,
} from './admin';

/** Y donde terminó la última tabla dibujada con autoTable. */
function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20;
}

function resumenProductos(venta: VentaReporte): string {
  if (venta.items.length === 0) return '—';
  return venta.items
    .map((it) => {
      const opcion =
        it.tipo_precio === 'precio_especial'
          ? ' [P. Especial]'
          : it.tipo_precio === 'precio_2'
            ? ' [Precio 2]'
            : it.tipo_precio === 'precio_3'
              ? ' [Precio 3]'
              : '';
      return `${it.producto ?? 'Producto'}${opcion} (x${it.cantidad})`;
    })
    .join(', ');
}

export interface ParametrosReportePdf {
  reporte: ReporteVentas;
  sucursalNombre?: string;
  empleadoNombre?: string;
  productoNombre?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

function formatoMonedaPdf(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}

function formatearFechaHora(fechaIso: string): string {
  if (!fechaIso) return '—';
  try {
    const d = new Date(fechaIso);
    return d.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return fechaIso;
  }
}

export function generarReporteVentasPdf({
  reporte,
  sucursalNombre,
  empleadoNombre,
  productoNombre,
  fechaDesde,
  fechaHasta,
}: ParametrosReportePdf) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Colores del tema Casa Baterías
  const colorPrimario = [62, 50, 211]; // Indigo #3e32d3
  const colorOscuro = [25, 28, 30]; // Dark #191c1e
  const colorGrisTexto = [80, 85, 95];
  const colorFondoCaja = [245, 246, 250];
  const colorBordeCaja = [220, 224, 235];

  // 1. ENCABEZADO CORPORATIVO
  // Banda superior decorativa
  doc.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  let currentY = 16;

  // Título de la empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text('CASA BATERÍAS', marginLeft, currentY);

  // Fecha y hora de emisión (alineada a la derecha)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  const ahoraTexto = `Emisión: ${new Date().toLocaleString('es-MX')}`;
  doc.text(ahoraTexto, pageWidth - marginRight, currentY, { align: 'right' });

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
  doc.text('REPORTE OFICIAL DE AUDITORÍA Y VENTAS', marginLeft, currentY);

  currentY += 4;
  // Línea divisoria horizontal
  doc.setDrawColor(colorBordeCaja[0], colorBordeCaja[1], colorBordeCaja[2]);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);

  currentY += 6;

  // 2. PARÁMETROS DEL REPORTE (Filtros aplicados)
  doc.setFillColor(colorFondoCaja[0], colorFondoCaja[1], colorFondoCaja[2]);
  doc.roundedRect(marginLeft, currentY, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(colorBordeCaja[0], colorBordeCaja[1], colorBordeCaja[2]);
  doc.roundedRect(marginLeft, currentY, contentWidth, 18, 2, 2, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);

  const pFila1Y = currentY + 6;
  const pFila2Y = currentY + 13;

  doc.text('Período:', marginLeft + 4, pFila1Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  const textoPeriodo =
    fechaDesde || fechaHasta
      ? `${fechaDesde || 'Inicio histórico'}  hasta  ${fechaHasta || 'Hoy'}`
      : 'Historial completo';
  doc.text(textoPeriodo, marginLeft + 20, pFila1Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text('Sucursal:', marginLeft + 95, pFila1Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  doc.text(sucursalNombre || 'Todas las sucursales', marginLeft + 112, pFila1Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text('Empleado:', marginLeft + 4, pFila2Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  doc.text(empleadoNombre || 'Todos los empleados', marginLeft + 22, pFila2Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text('Producto:', marginLeft + 95, pFila2Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  doc.text(productoNombre || 'Todos los modelos', marginLeft + 112, pFila2Y);

  currentY += 24;

  // 3. RESUMEN EJECUTIVO (KPIs)
  const boxWidth = (contentWidth - 6) / 3;
  const boxHeight = 18;

  // Lo cobrado se separa por forma de pago (el pago mixto, repartido). Las
  // ventas a crédito no se cobraron: van en su propia tabla y no suman.
  const porGrupo = reporte.totales.por_grupo ?? totalesPorGrupo(reporte.ventas);
  const ventasCredito = reporte.ventas.filter((v) => grupoDeMetodo(v.metodo_pago) === 'credito');
  const ventasCobradas = reporte.ventas.filter((v) => grupoDeMetodo(v.metodo_pago) !== 'credito');
  const unidadesCobradas = ventasCobradas.reduce(
    (s, v) => s + v.items.reduce((si, it) => si + it.cantidad, 0),
    0,
  );

  // Caja 1: Total cobrado
  doc.setFillColor(238, 237, 254); // Tinte índigo suave
  doc.roundedRect(marginLeft, currentY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
  doc.roundedRect(marginLeft, currentY, boxWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
  doc.text('TOTAL COBRADO (SIN CRÉDITOS)', marginLeft + 4, currentY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
  doc.text(formatoMonedaPdf(porGrupo.cobrado), marginLeft + 4, currentY + 13);

  // Caja 2: Total de Ventas
  const box2X = marginLeft + boxWidth + 3;
  doc.setFillColor(colorFondoCaja[0], colorFondoCaja[1], colorFondoCaja[2]);
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(colorBordeCaja[0], colorBordeCaja[1], colorBordeCaja[2]);
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  doc.text('VENTAS COBRADAS', box2X + 4, currentY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text(`${ventasCobradas.length} ventas`, box2X + 4, currentY + 13);

  // Caja 3: Unidades Vendidas
  const box3X = box2X + boxWidth + 3;
  doc.setFillColor(colorFondoCaja[0], colorFondoCaja[1], colorFondoCaja[2]);
  doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(colorBordeCaja[0], colorBordeCaja[1], colorBordeCaja[2]);
  doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  doc.text('BATERÍAS COBRADAS', box3X + 4, currentY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text(`${unidadesCobradas} unidades`, box3X + 4, currentY + 13);

  currentY += boxHeight + 4;

  // Desglose: efectivo y electrónico por separado (cada uno es su corte);
  // el crédito, aparte.
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text(
    `Efectivo: ${formatoMonedaPdf(porGrupo.efectivo)}     |     Tarjetas: ${formatoMonedaPdf(porGrupo.tarjeta)}     |     Transferencias: ${formatoMonedaPdf(porGrupo.transferencia)}`,
    marginLeft + 2,
    currentY + 2,
  );
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  doc.text(
    `Ventas a crédito a empresas (no cobradas, no entran a caja): ${formatoMonedaPdf(porGrupo.credito)} en ${ventasCredito.length} ventas`,
    marginLeft + 2,
    currentY + 7,
  );

  currentY += 12;

  const pieDePagina = (data: { pageNumber: number }) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 145, 160);
    doc.setDrawColor(220, 224, 235);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);
    doc.text('Documento oficial de control interno — Casa Baterías ERP', marginLeft, pageHeight - 7);
    doc.text(`Página ${data.pageNumber}`, pageWidth - marginRight, pageHeight - 7, { align: 'right' });
  };

  // 4. TABLA DETALLADA DE VENTAS COBRADAS
  const tableData = ventasCobradas.map((venta) => {
    const metodo =
      venta.metodo_pago === 'mixto' && venta.desglose_pago?.length
        ? venta.desglose_pago
            .map((p) => `${etiquetaMetodoPago(p.metodo)} ${formatoMonedaPdf(Number(p.monto))}`)
            .join(' + ')
        : etiquetaMetodoPago(venta.metodo_pago);

    return [
      venta.folio,
      formatearFechaHora(venta.created_at),
      venta.sucursal ?? '—',
      venta.usuario ?? '—',
      metodo,
      resumenProductos(venta),
      formatoMonedaPdf(venta.total),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Folio',
        'Fecha / Hora',
        'Sucursal',
        'Cajero',
        'Método',
        'Detalle de Productos',
        'Total',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [62, 50, 211],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', fontSize: 7.5 },
      1: { cellWidth: 26, fontSize: 7.5 },
      2: { cellWidth: 22, fontSize: 7.5 },
      3: { cellWidth: 24, fontSize: 7.5 },
      4: { cellWidth: 24, fontSize: 7 },
      5: { cellWidth: 'auto', fontSize: 7.5 },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold', fontSize: 8 },
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2.5,
      textColor: [30, 35, 45],
      lineColor: [230, 233, 242],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 253],
    },
    didDrawPage: pieDePagina,
    margin: { left: marginLeft, right: marginRight, bottom: 16 },
  });

  // 5. VENTAS A CRÉDITO: apartado propio, fuera de lo cobrado.
  if (ventasCredito.length > 0) {
    let y = finalY(doc) + 10;
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(180, 83, 9);
    doc.text('VENTAS A CRÉDITO A EMPRESAS', marginLeft, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
    doc.text(
      `No se cobraron en caja y no forman parte del corte. Total: ${formatoMonedaPdf(porGrupo.credito)}`,
      marginLeft,
      y + 5,
    );

    autoTable(doc, {
      startY: y + 8,
      head: [['Folio', 'Fecha / Hora', 'Sucursal', 'Cajero', 'Detalle de Productos', 'Total']],
      body: ventasCredito.map((venta) => [
        venta.folio,
        formatearFechaHora(venta.created_at),
        venta.sucursal ?? '—',
        venta.usuario ?? '—',
        resumenProductos(venta),
        formatoMonedaPdf(venta.total),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold', fontSize: 7.5 },
        1: { cellWidth: 26, fontSize: 7.5 },
        2: { cellWidth: 22, fontSize: 7.5 },
        3: { cellWidth: 24, fontSize: 7.5 },
        4: { cellWidth: 'auto', fontSize: 7.5 },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', fontSize: 8 },
      },
      styles: { overflow: 'linebreak', cellPadding: 2.5, textColor: [30, 35, 45], lineColor: [230, 233, 242], lineWidth: 0.2 },
      didDrawPage: pieDePagina,
      margin: { left: marginLeft, right: marginRight, bottom: 16 },
    });
  }

  // Guardar archivo PDF con nombre legible
  const nombreArchivo = `Reporte-Ventas-CasaBaterias-${fechaHasta || 'actual'}.pdf`;
  doc.save(nombreArchivo);
}

export function generarReporteAltasPdf({
  reporte,
  sucursalNombre,
  productoNombre,
  origenNombre,
  fechaDesde,
  fechaHasta,
}: {
  reporte: ReporteAltas;
  sucursalNombre?: string;
  productoNombre?: string;
  origenNombre?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 10;
  const marginRight = 10;

  doc.setFillColor(62, 50, 211);
  doc.rect(0, 0, pageWidth, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(25, 28, 30);
  doc.text('CASA BATERÍAS', marginLeft, 14);

  doc.setFontSize(11);
  doc.text('Acuse de altas de inventario', marginLeft, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 85, 95);
  const filtros = [
    sucursalNombre ? `Sucursal: ${sucursalNombre}` : 'Sucursal: todas',
    productoNombre ? `Producto: ${productoNombre}` : 'Producto: todos',
    origenNombre ? `Tipo: ${origenNombre}` : 'Tipo: todos',
    `Del ${fechaDesde || 'inicio'} al ${fechaHasta || 'hoy'}`,
    `${reporte.totales.operaciones} acuses · ${reporte.totales.unidades} unidades`,
  ].join('   |   ');
  doc.text(filtros, marginLeft, 27);

  autoTable(doc, {
    startY: 32,
    head: [[
      'Folio',
      'Fecha',
      'Sucursal',
      'Registró',
      'Tipo',
      'Marca',
      'Modelo',
      'Código',
      'Cant.',
      'Antes',
      'Después',
      'Nota',
    ]],
    body: reporte.lineas.map((linea) => [
      linea.folio,
      formatearFechaHora(linea.created_at),
      linea.sucursal ?? '—',
      linea.usuario ?? '—',
      etiquetaOrigenAlta(linea.origen, linea.modo),
      linea.marca ?? '—',
      linea.modelo ?? '—',
      linea.codigo_barras ?? '—',
      String(linea.cantidad),
      linea.existencia_anterior == null ? '—' : String(linea.existencia_anterior),
      linea.existencia_nueva == null ? '—' : String(linea.existencia_nueva),
      linea.nota ?? '',
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [62, 50, 211],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 1.6,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.4,
      overflow: 'linebreak',
      textColor: [30, 35, 45],
      lineColor: [230, 233, 242],
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: [249, 250, 253] },
    margin: { left: marginLeft, right: marginRight, bottom: 14 },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 145, 160);
      doc.text(
        'Acuse de control interno — Casa Baterías ERP',
        marginLeft,
        pageHeight - 6,
      );
      doc.text(`Página ${data.pageNumber}`, pageWidth - marginRight, pageHeight - 6, {
        align: 'right',
      });
    },
  });

  doc.save(`Acuse-Altas-CasaBaterias-${fechaHasta || 'actual'}.pdf`);
}

// ---------------------------------------------------------------------
// Documentos de una sola sección: encabezado, tablas y pie comunes
// ---------------------------------------------------------------------

const AZUL: [number, number, number] = [62, 50, 211];
const AMBAR: [number, number, number] = [180, 83, 9];
const VERDE: [number, number, number] = [22, 130, 70];

const ESTILO_TABLA = {
  theme: 'grid' as const,
  styles: {
    overflow: 'linebreak' as const,
    fontSize: 8,
    cellPadding: 2,
    textColor: [30, 35, 45] as [number, number, number],
    lineColor: [230, 233, 242] as [number, number, number],
    lineWidth: 0.2,
  },
  alternateRowStyles: { fillColor: [249, 250, 253] as [number, number, number] },
};

/** Banda, nombre de la empresa, título, renglones de datos y línea. Devuelve la Y siguiente. */
function encabezado(doc: jsPDF, titulo: string, datos: string[], color = AZUL): number {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(0, 0, ancho, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(25, 28, 30);
  doc.text('CASA BATERÍAS', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 85, 95);
  doc.text(`Emisión: ${new Date().toLocaleString('es-MX')}`, ancho - 14, 15, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(titulo, 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 65, 75);
  let y = 28;
  for (const linea of datos) {
    doc.text(linea, 14, y);
    y += 5;
  }

  doc.setDrawColor(220, 224, 235);
  doc.setLineWidth(0.4);
  doc.line(14, y - 1, ancho - 14, y - 1);
  return y + 4;
}

function pie(doc: jsPDF, leyenda: string) {
  return (data: { pageNumber: number }) => {
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 145, 160);
    doc.text(leyenda, 14, alto - 7);
    doc.text(`Página ${data.pageNumber}`, ancho - 14, alto - 7, { align: 'right' });
  };
}

function subtitulo(doc: jsPDF, texto: string, y: number, color = AZUL, nota?: string): number {
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(texto, 14, y);
  if (nota) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 105, 115);
    doc.text(nota, 14, y + 4.5);
    return y + 8;
  }
  return y + 3;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function marcaModelo(marca: string | null, modelo: string | null): string {
  return [marca, modelo].filter(Boolean).join(' ') || '—';
}

function datosDelCorte(r: ResumenCorte): string[] {
  return [
    `Sucursal: ${r.sucursal ?? '—'}`,
    `Apertura: ${formatearFechaHora(r.abierto_en)}  (${r.abrio ?? '—'})`,
    r.cerrado_en
      ? `Cierre: ${formatearFechaHora(r.cerrado_en)}  (${r.cerro ?? '—'})`
      : 'Caja abierta: corte parcial a la hora de emisión',
  ];
}

/** Corte de efectivo: solo lo que entra y sale del cajón. */
export function generarCorteEfectivoPdf(r: ResumenCorte) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const e = r.efectivo;
  const y = encabezado(doc, 'CORTE DE EFECTIVO', datosDelCorte(r), VERDE);

  const filas: Array<[string, string]> = [
    ['Fondo inicial', formatoMonedaPdf(e.monto_inicial)],
    [`(+) Ventas en efectivo (${e.ventas_count})`, formatoMonedaPdf(e.ventas)],
    ['(+) Intercambios de cascos en efectivo', formatoMonedaPdf(e.intercambios)],
    ['(+) Abonos de crédito en efectivo', formatoMonedaPdf(e.abonos_credito)],
    ['(−) Devoluciones pagadas en efectivo', formatoMonedaPdf(e.devoluciones)],
    ['= Efectivo esperado en caja', formatoMonedaPdf(e.esperado)],
  ];
  if (e.contado != null) {
    filas.push(['Efectivo contado', formatoMonedaPdf(e.contado)]);
    const dif = e.diferencia ?? 0;
    filas.push([
      dif === 0 ? 'Diferencia' : dif > 0 ? 'Diferencia (sobrante)' : 'Diferencia (faltante)',
      formatoMonedaPdf(dif),
    ]);
  }

  autoTable(doc, {
    ...ESTILO_TABLA,
    startY: y,
    head: [['Concepto', 'Importe']],
    body: filas,
    headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 45, fontStyle: 'bold' } },
    styles: { ...ESTILO_TABLA.styles, fontSize: 10, cellPadding: 3 },
    didParseCell: (data) => {
      const concepto = String(data.row.raw && (data.row.raw as string[])[0]);
      if (data.section === 'body' && (concepto.startsWith('=') || concepto.startsWith('Diferencia'))) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [236, 247, 240];
      }
    },
    didDrawPage: pie(doc, 'Corte de efectivo — Casa Baterías ERP'),
    margin: { left: 14, right: 14, bottom: 16 },
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 105, 115);
  doc.text(
    'Tarjetas, transferencias y ventas a crédito no forman parte de este corte.',
    14,
    finalY(doc) + 7,
  );
  firmas(doc, finalY(doc) + 30);

  doc.save(`Corte-Efectivo-${nombreArchivoCorte(r)}.pdf`);
}

/** Corte de tarjetas y transferencias, con cada operación. */
export function generarCorteElectronicoPdf(r: ResumenCorte) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const el = r.electronico;
  let y = encabezado(doc, 'CORTE DE TARJETAS Y TRANSFERENCIAS', datosDelCorte(r));

  const filas: Array<[string, string]> = [
    ['Tarjeta de débito', formatoMonedaPdf(el.tarjeta_debito)],
    ['Tarjeta de crédito', formatoMonedaPdf(el.tarjeta_credito)],
  ];
  if (el.tarjeta_sin_tipo) filas.push(['Tarjeta (sin especificar)', formatoMonedaPdf(el.tarjeta_sin_tipo)]);
  if (el.devoluciones_tarjeta) filas.push(['(−) Devoluciones a tarjeta', formatoMonedaPdf(el.devoluciones_tarjeta)]);
  filas.push(['= Total tarjetas', formatoMonedaPdf(el.total_tarjetas)]);
  filas.push(['Transferencias', formatoMonedaPdf(el.transferencias)]);
  if (el.devoluciones_transferencia) {
    filas.push(['(−) Devoluciones por transferencia', formatoMonedaPdf(el.devoluciones_transferencia)]);
  }
  filas.push(['= Total transferencias', formatoMonedaPdf(el.total_transferencias)]);
  filas.push(['TOTAL TARJETAS Y TRANSFERENCIAS', formatoMonedaPdf(el.total)]);

  autoTable(doc, {
    ...ESTILO_TABLA,
    startY: y,
    head: [['Concepto', 'Importe']],
    body: filas,
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 45, fontStyle: 'bold' } },
    styles: { ...ESTILO_TABLA.styles, fontSize: 10, cellPadding: 3 },
    didParseCell: (data) => {
      const concepto = String(data.row.raw && (data.row.raw as string[])[0]);
      if (data.section === 'body' && (concepto.startsWith('=') || concepto.startsWith('TOTAL'))) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [238, 237, 254];
      }
    },
    didDrawPage: pie(doc, 'Corte de tarjetas y transferencias — Casa Baterías ERP'),
    margin: { left: 14, right: 14, bottom: 16 },
  });

  y = subtitulo(doc, 'Operaciones', finalY(doc) + 10);
  autoTable(doc, {
    ...ESTILO_TABLA,
    startY: y,
    head: [['Hora', 'Folio', 'Concepto', 'Forma de pago', 'Importe']],
    body: el.operaciones.length
      ? el.operaciones.map((o) => [
          hora(o.creado_en),
          o.folio ?? '—',
          o.detalle ?? (o.origen === 'venta' ? 'Venta' : o.origen),
          etiquetaMetodoPago(o.metodo),
          formatoMonedaPdf(o.monto),
        ])
      : [['', '', 'Sin operaciones con tarjeta ni transferencia', '', '']],
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
    didDrawPage: pie(doc, 'Corte de tarjetas y transferencias — Casa Baterías ERP'),
    margin: { left: 14, right: 14, bottom: 16 },
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 105, 115);
  doc.text('El efectivo y las ventas a crédito no forman parte de este corte.', 14, finalY(doc) + 7);

  doc.save(`Corte-Tarjetas-Transferencias-${nombreArchivoCorte(r)}.pdf`);
}

function nombreArchivoCorte(r: ResumenCorte): string {
  const fecha = new Date(r.abierto_en).toLocaleDateString('en-CA');
  const sucursal = (r.sucursal ?? 'sucursal').replace(/\s+/g, '-');
  return `${sucursal}-${fecha}`;
}

function firmas(doc: jsPDF, y: number) {
  const ancho = doc.internal.pageSize.getWidth();
  if (y > doc.internal.pageSize.getHeight() - 25) {
    doc.addPage();
    y = 40;
  }
  doc.setDrawColor(120, 125, 135);
  doc.setLineWidth(0.3);
  doc.line(24, y, 84, y);
  doc.line(ancho - 84, y, ancho - 24, y);
  doc.setFontSize(8);
  doc.setTextColor(80, 85, 95);
  doc.text('Entregó', 54, y + 4, { align: 'center' });
  doc.text('Recibió', ancho - 54, y + 4, { align: 'center' });
}

// ---------------------------------------------------------------------
// Existencias de una sucursal
// ---------------------------------------------------------------------

export interface FilaExistencia {
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  cascos?: number;
}

const ordenNatural = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/** Modelos ordenados por marca y modelo (24, 42, 65, 100…), para imprimir y contar. */
export function ordenarExistencias(filas: FilaExistencia[]): FilaExistencia[] {
  return [...filas].sort(
    (a, b) =>
      ordenNatural.compare(a.marca ?? '', b.marca ?? '') ||
      ordenNatural.compare(a.modelo ?? '', b.modelo ?? ''),
  );
}

export function generarExistenciasPdf({
  sucursalNombre,
  filas,
  incluirCascos,
}: {
  sucursalNombre: string;
  filas: FilaExistencia[];
  incluirCascos: boolean;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ordenadas = ordenarExistencias(filas);
  const piezas = ordenadas.reduce((s, f) => s + f.cantidad, 0);
  const y = encabezado(doc, 'EXISTENCIAS EN SUCURSAL', [
    `Sucursal: ${sucursalNombre}`,
    `${ordenadas.length} modelos con existencia · ${piezas} piezas`,
  ]);

  const head = incluirCascos
    ? [['#', 'Marca', 'Modelo', 'Existencia', 'Cascos', 'Conteo físico']]
    : [['#', 'Marca', 'Modelo', 'Existencia', 'Conteo físico']];

  autoTable(doc, {
    ...ESTILO_TABLA,
    startY: y,
    head,
    body: ordenadas.map((f, i) => {
      const fila = [String(i + 1), f.marca ?? '—', f.modelo ?? '—', String(f.cantidad)];
      if (incluirCascos) fila.push(String(f.cascos ?? 0));
      fila.push('');
      return fila;
    }),
    foot: [
      incluirCascos
        ? ['', '', 'TOTAL', String(piezas), String(ordenadas.reduce((s, f) => s + (f.cascos ?? 0), 0)), '']
        : ['', '', 'TOTAL', String(piezas), ''],
    ],
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [238, 237, 254], textColor: [25, 28, 30], fontStyle: 'bold' },
    styles: { ...ESTILO_TABLA.styles, fontSize: 9.5, cellPadding: 2.2 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'right', textColor: [120, 125, 135] },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
      ...(incluirCascos ? { 4: { halign: 'center', cellWidth: 20 } } : {}),
      [incluirCascos ? 5 : 4]: { cellWidth: 30 },
    },
    didDrawPage: pie(doc, `Existencias de ${sucursalNombre} — Casa Baterías ERP`),
    margin: { left: 14, right: 14, bottom: 16 },
  });

  const fecha = new Date().toLocaleDateString('en-CA');
  doc.save(`Existencias-${sucursalNombre.replace(/\s+/g, '-')}-${fecha}.pdf`);
}

// ---------------------------------------------------------------------
// Créditos y traspasos del día
// ---------------------------------------------------------------------

export function generarCreditosTraspasosPdf(r: ReporteCreditosDia, sucursalNombre?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const t = r.totales;
  const fechaTexto = new Date(`${r.fecha}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  let y = encabezado(
    doc,
    'CRÉDITOS Y TRASPASOS DEL DÍA',
    [
      `Fecha: ${fechaTexto}    ·    Sucursal: ${sucursalNombre ?? 'todas'}`,
      `Ventas a crédito: ${t.creditos} (${t.piezas_credito} pilas, ${formatoMonedaPdf(t.monto_creditos)})    ·    Abonos: ${t.abonos} (${formatoMonedaPdf(t.monto_abonos)})    ·    Traspasos: ${t.traspasos} (${t.piezas_traspasadas} pilas)`,
    ],
    AMBAR,
  );
  const leyenda = pie(doc, 'Créditos y traspasos del día — Casa Baterías ERP');

  y = subtitulo(doc, 'Ventas a crédito', y + 2, AMBAR, 'No se cobraron en caja: quedan como saldo de la empresa.');
  autoTable(doc, {
    ...ESTILO_TABLA,
    startY: y,
    head: [['Hora', 'Folio', 'Empresa', 'Sucursal', 'Vale / Recibió / Placas', 'Pilas', 'Total']],
    body: r.creditos.length
      ? r.creditos.map((c) => [
          hora(c.created_at),
          c.folio ?? '—',
          c.empresa ?? '—',
          c.sucursal ?? '—',
          [c.folio_vale && `Vale ${c.folio_vale}`, c.recibido_por, c.vehiculo_placas]
            .filter(Boolean)
            .join(' · ') || '—',
          c.items
            .map((i) => `${marcaModelo(i.marca, i.modelo)} x${i.cantidad}${i.con_casco === false ? ' (sin casco)' : ''}`)
            .join(', '),
          formatoMonedaPdf(c.total),
        ])
      : [['', '', 'Sin ventas a crédito este día', '', '', '', '']],
    headStyles: { fillColor: AMBAR, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 26, fontStyle: 'bold' }, 6: { halign: 'right', fontStyle: 'bold', cellWidth: 26 } },
    didDrawPage: leyenda,
    margin: { left: 14, right: 14, bottom: 16 },
  });

  y = subtitulo(doc, 'Abonos recibidos', finalY(doc) + 10, AMBAR);
  autoTable(doc, {
    ...ESTILO_TABLA,
    startY: y,
    head: [['Hora', 'Empresa', 'Sucursal', 'Recibió', 'Forma de pago', 'Referencia', 'Monto']],
    body: r.abonos.length
      ? r.abonos.map((a) => [
          hora(a.created_at),
          a.empresa ?? '—',
          a.sucursal ?? '—',
          a.usuario ?? '—',
          etiquetaMetodoPago(a.metodo_pago),
          a.referencia ?? '—',
          formatoMonedaPdf(a.monto),
        ])
      : [['', 'Sin abonos este día', '', '', '', '', '']],
    headStyles: { fillColor: AMBAR, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 6: { halign: 'right', fontStyle: 'bold', cellWidth: 26 } },
    didDrawPage: leyenda,
    margin: { left: 14, right: 14, bottom: 16 },
  });

  y = subtitulo(doc, 'Traspasos entre sucursales', finalY(doc) + 10);
  autoTable(doc, {
    ...ESTILO_TABLA,
    startY: y,
    head: [['Hora', 'Modelo', 'Pilas', 'De', 'A', 'Autorizó', 'Nota']],
    body: r.traspasos.length
      ? r.traspasos.map((tr) => [
          hora(tr.created_at),
          marcaModelo(tr.marca, tr.modelo),
          String(tr.cantidad),
          tr.origen ?? '—',
          tr.destino ?? '—',
          tr.autorizo ?? '—',
          tr.nota ?? '',
        ])
      : [['', 'Sin traspasos este día', '', '', '', '', '']],
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'center', fontStyle: 'bold', cellWidth: 16 } },
    didDrawPage: leyenda,
    margin: { left: 14, right: 14, bottom: 16 },
  });

  doc.save(`Creditos-Traspasos-${r.fecha}.pdf`);
}
