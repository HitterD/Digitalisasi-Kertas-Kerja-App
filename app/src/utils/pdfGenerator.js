import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Shared PDF table configuration (DRY)
/**
 * Reset jsPDF document style ke default setelah render table.
 */
export function resetDocStyle(doc) {
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.setFontSize(8);
}

const TABLE_COLUMN_STYLES = {
    0: { cellWidth: 10, halign: 'center' },
    1: { cellWidth: 25 },
    2: { cellWidth: 45 },
    3: { cellWidth: 20 },
    4: { cellWidth: 15, halign: 'center' },
    5: { cellWidth: 15, halign: 'center' },
    6: { cellWidth: 15, halign: 'center' },
    7: { cellWidth: 25, halign: 'center' },
    8: { cellWidth: 30, halign: 'center' },
    9: { cellWidth: 50 },
};

const TABLE_BASE_STYLES = {
    font: 'helvetica',
    fontSize: 7,
    cellPadding: 3,
    lineWidth: 0.1,
    lineColor: [212, 212, 216], // Zinc 300
    textColor: [24, 24, 27], // Zinc 900
};

const TABLE_HEADERS = [
    ['NO', 'BARCODE\nASET', 'NAMA ASET', 'No. PO', 'TIPE', 'BULAN', 'TAHUN', 'ADA/\nTDK ADA', 'KONDISI\nSAAT INI', 'KETERANGAN']
];

/**
 * Generate a single PDF for one room/sheet
 * @param {Object} roomData - Room data with meta, assets, noBarcodeAssets, notAtLocationAssets, signatures
 * @returns {jsPDF} doc
 */
export function generateRoomPDF(roomData) {
    const { meta, assets, noBarcodeAssets, notAtLocationAssets, signatures } = roomData;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;

    // ===== HEADER =====
    doc.setTextColor(24, 24, 27);
    
    // Top border thick
    doc.setLineWidth(1.5);
    doc.setDrawColor(24, 24, 27);
    doc.line(margin, 12, pageWidth - margin, 12);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text((meta.title || 'KERTAS KERJA OPNAME ASET TETAP - ICT').toUpperCase(), margin, 19);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(meta.area || 'AREA: PT Santos Jaya Abadi - Sepanjang', pageWidth - margin, 19, { align: 'right' });
    
    // Thin line
    doc.setLineWidth(0.2);
    doc.line(margin, 23, pageWidth - margin, 23);
    
    // Metadata Grid
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    // Calculate columns for landscape A4 (approx 297mm width)
    const col1X = margin;
    const col2X = margin + 120; // +120mm for RUANGAN
    const col3X = margin + 175; // +55mm for PIC
    const col4X = margin + 235; // +60mm for PERIODE
    
    doc.text('RUANGAN', col1X, 28);
    doc.text('PIC RUANGAN', col2X, 28);
    doc.text('PERIODE', col3X, 28);
    doc.text('TANGGAL', col4X, 28);
    
    doc.setFont('helvetica', 'normal');
    let displayRoomName = meta.roomName || '-';
    // Remove auto-prefix if already contains 'RUANG' correctly but user explicitly sets the long string
    
    // Draw text with maxWidth so it wraps instead of overflowing to the next column
    doc.text(displayRoomName, col1X, 33, { maxWidth: 115 });
    doc.text(meta.picName || '-', col2X, 33, { maxWidth: 50 });
    doc.text(meta.period || '-', col3X, 33, { maxWidth: 55 });
    doc.text(meta.date || '-', col4X, 33, { maxWidth: 40 });
    
    // Bottom line of metadata - pushed down slightly to accommodate 2-line wrapped text
    const metaBottomY = 38;
    doc.line(margin, metaBottomY, pageWidth - margin, metaBottomY);

    // ===== LEGEND (KETERANGAN WARNA) =====
    const legendY = 41;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(113, 113, 122); // Zinc 500
    doc.text('Keterangan Warna Baris:', margin, legendY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.1);
    
    // Red box (Belum Terscan)
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(220, 38, 38);
    doc.rect(margin + 33, legendY, 4, 4, 'FD');
    doc.setTextColor(24, 24, 27);
    doc.text('Belum Terscan', margin + 39, legendY + 3.2);

    // White box (Sudah Terscan)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(161, 161, 170);
    doc.rect(margin + 60, legendY, 4, 4, 'FD');
    doc.text('Sudah Terscan / Sesuai', margin + 66, legendY + 3.2);

    // Yellow box (Cetak Ulang)
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(margin + 100, legendY, 4, 4, 'FD');
    doc.text('Cetak Ulang Barcode', margin + 106, legendY + 3.2);

    let startY = 48;

    // ===== MAIN ASSET TABLE =====
    const mainData = assets.map((a, i) => [
        a.no || (i + 1).toString(),
        a.barcode || '',
        a.namaAset || '',
        a.noPO || '',
        a.tipe || '',
        a.bulanPerolehan || '',
        a.tahunPerolehan || '',
        a.adaTidakAda || '',
        a.kondisi || '',
        a.keterangan || '',
    ]);

    autoTable(doc, {
        startY,
        head: TABLE_HEADERS,
        body: mainData,
        margin: { left: margin, right: margin },
        styles: TABLE_BASE_STYLES,
        headStyles: {
            fillColor: [24, 24, 27], // Charcoal 900
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 7,
            lineWidth: 0.1,
            lineColor: [24, 24, 27]
        },
        columnStyles: TABLE_COLUMN_STYLES,
        didParseCell: function (data) {
            // Highlight rows based on condition and checked status
            if (data.section === 'body') {
                const asset = assets[data.row.index];
                if (asset) {
                    if (asset.kondisi === 'Cetak Ulang Barcode') {
                        data.cell.styles.fillColor = [254, 243, 199]; // Amber 100
                        data.cell.styles.textColor = [146, 64, 14]; // Amber 900
                    } else if (asset.isChecked) {
                        data.cell.styles.fillColor = [255, 255, 255]; // White checked
                        data.cell.styles.textColor = [24, 24, 27]; // Charcoal normal text
                    } else {
                        data.cell.styles.fillColor = [254, 242, 242]; // Red 50 (Unchecked)
                        data.cell.styles.textColor = [153, 27, 27]; // Red 800
                    }
                }
            }
        },
        theme: 'grid',
    });

    let currentY = doc.lastAutoTable.finalY + 8;

    // ===== NO BARCODE SECTION =====
    if (noBarcodeAssets && noBarcodeAssets.length > 0) {
        if (currentY > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            currentY = 15;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(82, 82, 91); // Zinc 600
        doc.text('ASSET TANPA BARCODE', margin, currentY);
        doc.setTextColor(24, 24, 27); // Reset
        currentY += 4;

        const noBarcodeData = noBarcodeAssets.map((a, i) => [
            (i + 1).toString(),
            a.barcode || '(NO BARCODE)',
            a.namaAset || '',
            a.noPO || '',
            a.tipe || '',
            a.bulanPerolehan || '',
            a.tahunPerolehan || '',
            a.adaTidakAda || '',
            a.kondisi || '',
            a.keterangan || '',
        ]);

        autoTable(doc, {
            startY: currentY,
            head: TABLE_HEADERS,
            body: noBarcodeData,
            margin: { left: margin, right: margin },
            styles: TABLE_BASE_STYLES,
            headStyles: {
                fillColor: [82, 82, 91], // Zinc 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                fontSize: 7,
                lineWidth: 0.1,
                lineColor: [82, 82, 91]
            },
            columnStyles: TABLE_COLUMN_STYLES,
            didParseCell: function (data) {
                if (data.section === 'body') {
                    const asset = noBarcodeAssets[data.row.index];
                    if (asset && asset.kondisi === 'Cetak Ulang Barcode') {
                        data.cell.styles.fillColor = [254, 243, 199];
                        data.cell.styles.textColor = [146, 64, 14];
                    }
                }
            },
            theme: 'grid',
        });
        currentY = doc.lastAutoTable.finalY + 8;
    }

    // ===== NOT AT LOCATION SECTION =====
    if (notAtLocationAssets && notAtLocationAssets.length > 0) {
        if (currentY > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            currentY = 15;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(153, 27, 27); // Red 800
        
        let roomNameText = 'RUANGAN INI';
        if (meta.roomName) {
            const upperName = meta.roomName.toUpperCase();
            roomNameText = upperName.startsWith('RUANG') ? upperName : `RUANG ${upperName}`;
        }
        doc.text(`ASSET TIDAK ADA DI LOKASI (DITEMUKAN DI ${roomNameText})`, margin, currentY);
        doc.setTextColor(24, 24, 27); // Reset
        currentY += 4;

        const notAtLocData = notAtLocationAssets.map((a, i) => [
            (i + 1).toString(),
            a.barcode || '',
            a.namaAset || '',
            a.noPO || '',
            a.tipe || '',
            a.bulanPerolehan || '',
            a.tahunPerolehan || '',
            a.adaTidakAda || '',
            a.kondisi || '',
            a.keterangan || '',
        ]);

        autoTable(doc, {
            startY: currentY,
            head: TABLE_HEADERS,
            body: notAtLocData,
            margin: { left: margin, right: margin },
            styles: TABLE_BASE_STYLES,
            headStyles: {
                fillColor: [153, 27, 27], // Red 800
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                fontSize: 7,
                lineWidth: 0.1,
                lineColor: [153, 27, 27]
            },
            columnStyles: TABLE_COLUMN_STYLES,
            didParseCell: function (data) {
                if (data.section === 'body') {
                    const asset = notAtLocationAssets[data.row.index];
                    if (asset && asset.kondisi === 'Cetak Ulang Barcode') {
                        data.cell.styles.fillColor = [254, 243, 199];
                        data.cell.styles.textColor = [146, 64, 14];
                    }
                }
            },
            theme: 'grid',
        });
        currentY = doc.lastAutoTable.finalY + 8;
    }

    // ===== SIGNATURE AREA =====
    if (currentY > doc.internal.pageSize.getHeight() - 65) {
        doc.addPage();
        currentY = 15;
    }

    currentY += 5;
    
    // Top border for Signature
    doc.setLineWidth(0.5);
    doc.setDrawColor(24, 24, 27);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text('PENGESAHAN OPNAME ASET', margin, currentY);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${meta.area}, ${meta.date}`, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 12;

    // 3 signature columns: Petugas 1, Petugas 2, PIC
    const sigColWidth = (pageWidth - margin * 2) / 3;
    const sig1X = margin + sigColWidth / 2;
    const sig2X = margin + sigColWidth + sigColWidth / 2;
    const sig3X = margin + sigColWidth * 2 + sigColWidth / 2;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PETUGAS OPNAME 1', sig1X, currentY, { align: 'center' });
    doc.text('PETUGAS OPNAME 2', sig2X, currentY, { align: 'center' });
    doc.text('PIC RUANGAN', sig3X, currentY, { align: 'center' });
    currentY += 3;

    // Signature images
    const sigImgW = 45;
    const sigImgH = 18;
    const sigKeys = [
        { key: 'petugasOpname1', x: sig1X },
        { key: 'petugasOpname2', x: sig2X },
        { key: 'picRuangan', x: sig3X },
    ];
    for (const { key, x } of sigKeys) {
        if (signatures?.[key]) {
            try {
                doc.addImage(signatures[key], 'PNG', x - sigImgW / 2, currentY, sigImgW, sigImgH);
            } catch (e) { /* signature not available */ }
        }
    }
    currentY += sigImgH + 5;

    // Signature lines
    doc.setLineWidth(0.3);
    for (const { x } of sigKeys) {
        doc.line(x - 25, currentY, x + 25, currentY);
    }
    currentY += 5;

    // Nama terang
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const nameKeys = ['petugasOpname1Name', 'petugasOpname2Name', 'picRuanganName'];
    const nameXs = [sig1X, sig2X, sig3X];
    for (let i = 0; i < 3; i++) {
        const name = signatures?.[nameKeys[i]] || '(.........................................)';
        doc.text(name, nameXs[i], currentY, { align: 'center' });
    }

    return doc;
}

/**
 * Save PDF for a single room using file-saver
 */
export function saveRoomPDF(roomData, filename) {
    const doc = generateRoomPDF(roomData);
    const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
    saveAs(blob, filename);
}

/**
 * Generate and save PDFs for all rooms with sequential downloads
 */
export async function generateAndSaveAllPDFs(rooms) {
    for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const roomName = (room.meta.roomName || room.sheetName || 'room')
            .replace(/[\\/:*?"<>|]/g, '-')
            .trim();
        const doc = generateRoomPDF(room);
        const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
        saveAs(blob, `${roomName}.pdf`);
        if (i < rooms.length - 1) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    return rooms.length;
}
