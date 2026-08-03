import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Utility untuk membuat PDF Berita Acara Serah Terima (BAST)
 * @param {Object} bast - Data dokumen BAST
 */
export function generateBastPdf(bast) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Header KOP Dokumen
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(24, 24, 27);
    doc.text('PT SANTOS JAYA ABADI', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('DEPARTEMEN INFORMATION & COMMUNICATION TECHNOLOGY (ICT)', margin, 23);

    // Line separator
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, 26, pageWidth - margin, 26);

    // Judul BAST
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('BERITA ACARA SERAH TERIMA (BAST) ASET ICT', pageWidth / 2, 34, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nomor: ${bast.noBast || 'BAST/ICT/2026/08/001'}`, pageWidth / 2, 39, { align: 'center' });

    // Preambule / Tanggal
    let currentY = 48;
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const formattedDate = bast.tanggal
        ? new Date(bast.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const preambule = `Pada hari ini ${formattedDate}, bertempat di ${bast.lokasi || 'Kantor PT Santos Jaya Abadi'}, kami yang bertanda tangan di bawah ini:`;
    const splitPreambule = doc.splitTextToSize(preambule, pageWidth - (margin * 2));
    doc.text(splitPreambule, margin, currentY);
    currentY += splitPreambule.length * 5 + 4;

    // Pihak Pertama & Second Block (2 Kolom)
    const boxWidth = (pageWidth - (margin * 2) - 8) / 2;

    // Box Pihak Pertama
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, boxWidth, 32, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('PIHAK PERTAMA (Yang Menyerahkan):', margin + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`NIK/NIP    : ${bast.pihak1?.nik || '-'}`, margin + 4, currentY + 13);
    doc.text(`Nama       : ${bast.pihak1?.nama || '-'}`, margin + 4, currentY + 19);
    doc.text(`Jabatan    : ${bast.pihak1?.jabatan || '-'}`, margin + 4, currentY + 25);
    doc.text(`Dept/Unit : ${bast.pihak1?.dept || '-'}`, margin + 4, currentY + 30);

    // Box Pihak Kedua
    const rightBoxX = margin + boxWidth + 8;
    doc.roundedRect(rightBoxX, currentY, boxWidth, 32, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('PIHAK KEDUA (Yang Menerima):', rightBoxX + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`NIK/NIP    : ${bast.pihak2?.nik || '-'}`, rightBoxX + 4, currentY + 13);
    doc.text(`Nama       : ${bast.pihak2?.nama || '-'}`, rightBoxX + 4, currentY + 19);
    doc.text(`Jabatan    : ${bast.pihak2?.jabatan || '-'}`, rightBoxX + 4, currentY + 25);
    doc.text(`Dept/Unit : ${bast.pihak2?.dept || '-'}`, rightBoxX + 4, currentY + 30);

    currentY += 38;

    // Statement
    const statement = 'Dengan ini menyatakan bahwa PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima aset/barang ICT dalam kondisi baik dan lengkap sesuai dengan rincian berikut:';
    const splitStatement = doc.splitTextToSize(statement, pageWidth - (margin * 2));
    doc.text(splitStatement, margin, currentY);
    currentY += splitStatement.length * 5 + 3;

    // Tabel Barang Aset
    const tableHeaders = [['NO', 'KODE / BARCODE', 'NAMA ASET / BARANG', 'MERK / TYPE', 'SERIAL NUMBER', 'QTY', 'KONDISI', 'KETERANGAN']];
    const tableRows = (bast.items || []).map((item, idx) => [
        idx + 1,
        item.barcode || '-',
        item.namaBarang || '-',
        item.merkType || '-',
        item.serialNumber || '-',
        item.qty || 1,
        item.kondisi || 'Baik',
        item.keterangan || '-'
    ]);

    autoTable(doc, {
        startY: currentY,
        head: tableHeaders,
        body: tableRows,
        margin: { left: margin, right: margin },
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2.5,
            lineWidth: 0.1,
            lineColor: [203, 213, 225],
            textColor: [30, 41, 59],
        },
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 32 },
            2: { cellWidth: 42 },
            3: { cellWidth: 28 },
            4: { cellWidth: 28 },
            5: { halign: 'center', cellWidth: 10 },
            6: { halign: 'center', cellWidth: 16 },
            7: { cellWidth: 'auto' },
        },
    });

    currentY = doc.lastAutoTable.finalY + 8;

    // Catatan Tambahan (jika ada)
    if (bast.catatan) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('Catatan / Syarat & Ketentuan:', margin, currentY);
        currentY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const splitCatatan = doc.splitTextToSize(bast.catatan, pageWidth - (margin * 2));
        doc.text(splitCatatan, margin, currentY);
        currentY += splitCatatan.length * 4 + 6;
    } else {
        currentY += 4;
    }

    // Pengecekan sisa halaman untuk Tanda Tangan
    if (currentY + 45 > pageHeight - margin) {
        doc.addPage();
        currentY = margin + 10;
    }

    // Tanda Tangan (3 Kolom: Pihak 1, Pihak 2, Mengetahui)
    const sigColWidth = (pageWidth - (margin * 2)) / 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    // Label Pihak 1
    doc.text('PIHAK PERTAMA', margin + (sigColWidth / 2), currentY, { align: 'center' });
    doc.text('(Yang Menyerahkan)', margin + (sigColWidth / 2), currentY + 4, { align: 'center' });

    // Label Pihak 2
    doc.text('PIHAK KEDUA', margin + sigColWidth + (sigColWidth / 2), currentY, { align: 'center' });
    doc.text('(Yang Menerima)', margin + sigColWidth + (sigColWidth / 2), currentY + 4, { align: 'center' });

    // Label Mengetahui
    doc.text('MENGETAHUI', margin + (sigColWidth * 2) + (sigColWidth / 2), currentY, { align: 'center' });
    doc.text('(Head of ICT)', margin + (sigColWidth * 2) + (sigColWidth / 2), currentY + 4, { align: 'center' });

    currentY += 10;

    // Render Gambar Tanda Tangan jika ada (base64)
    if (bast.pihak1?.ttd) {
        try {
            doc.addImage(bast.pihak1.ttd, 'PNG', margin + (sigColWidth / 2) - 15, currentY, 30, 18);
        } catch (e) {
            console.error('Failed to add ttd pihak 1:', e);
        }
    }
    if (bast.pihak2?.ttd) {
        try {
            doc.addImage(bast.pihak2.ttd, 'PNG', margin + sigColWidth + (sigColWidth / 2) - 15, currentY, 30, 18);
        } catch (e) {
            console.error('Failed to add ttd pihak 2:', e);
        }
    }
    if (bast.mengetahui?.ttd) {
        try {
            doc.addImage(bast.mengetahui.ttd, 'PNG', margin + (sigColWidth * 2) + (sigColWidth / 2) - 15, currentY, 30, 18);
        } catch (e) {
            console.error('Failed to add ttd mengetahui:', e);
        }
    }

    currentY += 20;

    // Nama & Garis Bawah
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(bast.pihak1?.nama ? `( ${bast.pihak1.nama} )` : '( .............................. )', margin + (sigColWidth / 2), currentY, { align: 'center' });
    doc.text(bast.pihak2?.nama ? `( ${bast.pihak2.nama} )` : '( .............................. )', margin + sigColWidth + (sigColWidth / 2), currentY, { align: 'center' });
    doc.text(bast.mengetahui?.nama ? `( ${bast.mengetahui.nama} )` : '( .............................. )', margin + (sigColWidth * 2) + (sigColWidth / 2), currentY, { align: 'center' });

    // Footer Dokumen
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Dokumen BAST Digital KKD - Dicetak pada ${new Date().toLocaleString('id-ID')}`, margin, pageHeight - 8);

    // Save File
    const fileName = `${bast.noBast ? bast.noBast.replace(/[/\\?%*:|"<>]/g, '_') : 'BAST_ASET_ICT'}.pdf`;
    doc.save(fileName);
}
