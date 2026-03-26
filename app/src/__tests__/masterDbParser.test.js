import { describe, it, expect } from 'vitest';
import { parseMasterDatabase, lookupBarcode } from '../utils/masterDbParser';
import * as XLSX from 'xlsx';

/**
 * Unit tests for masterDbParser
 */

function createMockWorkbook(rows) {
    const ws = XLSX.utils.aoa_to_sheet([
        ['INFO', 'BARCODE', 'NAMA ASSET', 'CN', 'LOKASI', 'PIC', 'BLN', 'THN', 'KONDISI', 'KAT', 'TIPE', 'KETERANGAN', 'KET OPNAME', 'TRX ID', 'NO PO'],
        ...rows
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('parseMasterDatabase', () => {
    it('should parse valid rows into a Map', () => {
        const buffer = createMockWorkbook([
            ['info1', '10001', 'Laptop Dell', 'CN1', 'Ruang A', 'John', '01', '2024', 'Baik', 'HW', 'Latitude', 'Ket1', '', '', 'PO-001'],
            ['info2', '10002', 'Monitor LG', 'CN2', 'Ruang B', 'Jane', '03', '2023', 'Rusak', 'HW', '24MK', 'Ket2', '', '', 'PO-002'],
        ]);
        const lookup = parseMasterDatabase(buffer);
        expect(lookup).toBeInstanceOf(Map);
        expect(lookup.size).toBe(2);
    });

    it('should map correct fields', () => {
        const buffer = createMockWorkbook([
            ['info1', '10001', 'Laptop Dell', 'CN1', 'Ruang A', 'John', '01', '2024', 'Baik', 'HW', 'Latitude', 'Ket1', '', '', 'PO-001'],
        ]);
        const lookup = parseMasterDatabase(buffer);
        const asset = lookup.get('10001');
        expect(asset.namaAset).toBe('Laptop Dell');
        expect(asset.noPO).toBe('PO-001');
        expect(asset.tipe).toBe('Latitude');
        expect(asset.bulanPerolehan).toBe('01');
        expect(asset.tahunPerolehan).toBe('2024');
        expect(asset.kondisi).toBe('Baik');
        expect(asset.lokasi).toBe('Ruang A');
    });

    it('should skip rows without barcode', () => {
        const buffer = createMockWorkbook([
            ['info1', '', 'No Barcode Item', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['info2', '10002', 'Valid Item', '', '', '', '', '', '', '', '', '', '', '', ''],
        ]);
        const lookup = parseMasterDatabase(buffer);
        expect(lookup.size).toBe(1);
        expect(lookup.has('10002')).toBe(true);
    });
});

describe('lookupBarcode', () => {
    it('should find existing barcode', () => {
        const map = new Map([['10001', { namaAset: 'Laptop' }]]);
        const result = lookupBarcode(map, '10001');
        expect(result).toEqual({ namaAset: 'Laptop' });
    });

    it('should return null for missing barcode', () => {
        const map = new Map([['10001', { namaAset: 'Laptop' }]]);
        expect(lookupBarcode(map, '99999')).toBeNull();
    });

    it('should handle null/empty inputs', () => {
        expect(lookupBarcode(null, '10001')).toBeNull();
        expect(lookupBarcode(new Map(), '')).toBeNull();
        expect(lookupBarcode(new Map(), null)).toBeNull();
    });

    it('should trim whitespace from barcode lookup', () => {
        const map = new Map([['10001', { namaAset: 'Laptop' }]]);
        expect(lookupBarcode(map, '  10001  ')).toEqual({ namaAset: 'Laptop' });
    });
});
