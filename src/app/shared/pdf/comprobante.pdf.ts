/** Generación del comprobante de inscripción en PDF (mismo diseño que reportes). */

export interface ComprobantePdfData {
  codigo: string;
  estado: string;
  grupo: string;
  modalidad: string;
  evento: string;
  responsable: string;
  dniResponsable: string;
  telefono: string;
  correo: string;
  metodoPago: string;
  numeroOperacion: string;
  monto: string;
  integrantes: Array<{
    nombres: string;
    dni: string;
    edad: string;
    sexo: string;
  }>;
}

export async function descargarComprobantePdf(data: ComprobantePdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  let logoW = 17.6;
  let logoH = logoW;
  try {
    const logoUrl = new URL('logo/LogoV1.png', document.baseURI).href;
    const blob = await fetch(logoUrl).then((r) => r.blob());
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const img = await new Promise<HTMLImageElement>((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(im);
      im.src = dataUrl;
    });
    const ratio = img.naturalHeight / img.naturalWidth || 1;
    logoH = logoW * ratio;
    if (logoH > 20) {
      logoH = 20;
      logoW = logoH / ratio;
    }
    doc.addImage(dataUrl, 'PNG', margin, margin - 3, logoW, logoH);
  } catch {
    /* sin logo */
  }
  const titleX = margin + logoW + 3.5;

  const hoy = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text('Chicote de Oro', titleX, margin + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 113, 108);
  doc.text(`Emitido el ${hoy}`, pageW - margin, margin + 3, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(68, 64, 60);
  doc.text('Comprobante de inscripción', titleX, margin + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 113, 108);
  doc.text(
    doc.splitTextToSize('VII Concurso Nacional de Caporales · CHICOTE DE ORO 2026', pageW - margin - titleX),
    titleX,
    margin + 13,
  );

  doc.setDrawColor(176, 141, 60);
  doc.setLineWidth(1);
  doc.line(margin, margin + 17, pageW - margin, margin + 17);

  const pendiente = data.estado.startsWith('Pendiente');
  doc.setFillColor(pendiente ? 245 : 16, pendiente ? 158 : 185, pendiente ? 11 : 129);
  doc.roundedRect(margin, margin + 20.5, 88, 10, 2.5, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Estado: ${data.estado}`, margin + 44, margin + 27.4, { align: 'center' });

  const filas: string[][] = [
    ['Código', data.codigo],
    ['Grupo', data.grupo],
    ['Modalidad', data.modalidad],
    ['Evento', data.evento],
    ['Responsable', data.responsable],
    ['DNI responsable', data.dniResponsable],
    ['Teléfono', data.telefono],
    ['Correo', data.correo],
    ['Integrantes', `${data.integrantes.length}`],
    ['Método de pago', data.metodoPago],
    ['Nº de operación', data.numeroOperacion],
    ['Monto pagado', data.monto],
  ];

  autoTable(doc, {
    startY: margin + 35,
    margin: { left: margin, right: margin },
    head: [['Dato', 'Detalle']],
    body: filas,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 2.5,
      textColor: [28, 25, 23],
      lineColor: [214, 211, 209],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [28, 25, 23],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 2.6,
    },
    alternateRowStyles: { fillColor: [250, 250, 249] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
  });

  const participantes = data.integrantes;
  if (participantes.length > 0) {
    const rowsP = participantes.map((p, i) => [
      `${i + 1}`,
      p.nombres,
      p.dni,
      p.edad,
      p.sexo,
    ]);
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 62,
      margin: { left: margin, right: margin },
      head: [['#', 'Participante', 'DNI', 'Edad', 'Sexo']],
      body: rowsP,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 2,
        textColor: [28, 25, 23],
        lineColor: [214, 211, 209],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [28, 25, 23],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 2.4,
      },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 13, halign: 'center' },
      },
    });
  }

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200,
    margin: { left: margin, right: margin },
    body: [['Organiza: Asoc. Cultural Chicote de Oro · WhatsApp 926 266 295 · Martha Bravo']],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, textColor: [120, 113, 108], cellPadding: 0 },
    didDrawPage: (data) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 113, 108);
      doc.text(
        `Comprobante de inscripción · Chicote de Oro — Página ${data.pageNumber}`,
        pageW / 2,
        pageH - 6,
        { align: 'center' },
      );
    },
  });

  doc.save(`comprobante-${data.codigo}.pdf`);
}