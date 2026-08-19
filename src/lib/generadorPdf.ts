import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type ReporteVentas } from './admin';

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

  // Cálculo de totales por método de pago
  let totalEfectivo = 0;
  let totalTarjeta = 0;
  let countEfectivo = 0;
  let countTarjeta = 0;

  for (const v of reporte.ventas) {
    const met = (v.metodo_pago ?? 'efectivo').toLowerCase();
    if (met === 'tarjeta') {
      totalTarjeta += v.total;
      countTarjeta += 1;
    } else {
      totalEfectivo += v.total;
      countEfectivo += 1;
    }
  }

  // Caja 1: Monto Total Recaudado
  doc.setFillColor(238, 237, 254); // Tinte índigo suave
  doc.roundedRect(marginLeft, currentY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
  doc.roundedRect(marginLeft, currentY, boxWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
  doc.text('TOTAL RECAUDADO', marginLeft + 4, currentY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
  doc.text(formatoMonedaPdf(reporte.totales.monto), marginLeft + 4, currentY + 13);

  // Caja 2: Total de Ventas
  const box2X = marginLeft + boxWidth + 3;
  doc.setFillColor(colorFondoCaja[0], colorFondoCaja[1], colorFondoCaja[2]);
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(colorBordeCaja[0], colorBordeCaja[1], colorBordeCaja[2]);
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  doc.text('TOTAL DE TRANSACCIONES', box2X + 4, currentY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text(`${reporte.totales.ventas} ventas`, box2X + 4, currentY + 13);

  // Caja 3: Unidades Vendidas
  const box3X = box2X + boxWidth + 3;
  doc.setFillColor(colorFondoCaja[0], colorFondoCaja[1], colorFondoCaja[2]);
  doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(colorBordeCaja[0], colorBordeCaja[1], colorBordeCaja[2]);
  doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  doc.text('BATERÍAS / PIEZAS VENDIDAS', box3X + 4, currentY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorOscuro[0], colorOscuro[1], colorOscuro[2]);
  doc.text(`${reporte.totales.unidades} unidades`, box3X + 4, currentY + 13);

  currentY += boxHeight + 4;

  // Franja de desglose de métodos de pago
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
  const textoMetodos = `Desglose de Pago:  Efectivo: ${formatoMonedaPdf(totalEfectivo)} (${countEfectivo} ventas)   |   Tarjeta: ${formatoMonedaPdf(totalTarjeta)} (${countTarjeta} ventas)`;
  doc.text(textoMetodos, marginLeft + 2, currentY + 2);

  currentY += 7;

  // 4. TABLA DETALLADA DE VENTAS
  const tableData = reporte.ventas.map((venta) => {
    const itemsResumen =
      venta.items.length === 0
        ? '—'
        : venta.items
            .map((it) => {
              const optLabel =
                it.tipo_precio === 'precio_especial'
                  ? ' [P. Especial]'
                  : it.tipo_precio === 'precio_2'
                  ? ' [Precio 2]'
                  : it.tipo_precio === 'precio_3'
                  ? ' [Precio 3]'
                  : '';
              return `${it.producto ?? 'Producto'}${optLabel} (x${it.cantidad})`;
            })
            .join(', ');

    const metodo = (venta.metodo_pago ?? 'efectivo').toUpperCase();

    return [
      venta.folio,
      formatearFechaHora(venta.created_at),
      venta.sucursal ?? '—',
      venta.usuario ?? '—',
      metodo,
      itemsResumen,
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
      0: { cellWidth: 20, fontStyle: 'bold', fontSize: 7.5 },
      1: { cellWidth: 28, fontSize: 7.5 },
      2: { cellWidth: 24, fontSize: 7.5 },
      3: { cellWidth: 26, fontSize: 7.5 },
      4: { cellWidth: 16, fontSize: 7, halign: 'center' },
      5: { cellWidth: 'auto', fontSize: 7.5 },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold', fontSize: 8 },
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
    didDrawPage: (data) => {
      // Pie de página oficial en cada página
      const pageNumber = data.pageNumber;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 145, 160);

      // Línea divisoria del pie
      doc.setDrawColor(220, 224, 235);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

      doc.text(
        'Documento oficial de control interno — Casa Baterías ERP',
        marginLeft,
        pageHeight - 7,
      );

      doc.text(
        `Página ${pageNumber}`,
        pageWidth - marginRight,
        pageHeight - 7,
        { align: 'right' },
      );
    },
    margin: { left: marginLeft, right: marginRight, bottom: 16 },
  });

  // Guardar archivo PDF con nombre legible
  const nombreArchivo = `Reporte-Ventas-CasaBaterias-${fechaHasta || 'actual'}.pdf`;
  doc.save(nombreArchivo);
}
