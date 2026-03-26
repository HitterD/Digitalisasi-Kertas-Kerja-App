import { describe, it, expect } from 'vitest';
import { parseHistoryDatabase, lookupBarcodeHistory } from '../utils/historyDbParser';
import * as XLSX from 'xlsx';

/**
 * Unit tests for historyDbParser
 */

function createMockHistoryWorkbook(rows) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('parseHistoryDatabase', () => {
    it('should parse multiple records per barcode', () => {
        const buffer = createMockHistoryWorkbook([
            { BARCODE: '10001', RUANGAN: 'A1', KETERANGAN: 'Pindah', KONDISI: 'Baik', TRANS_DATE: '2024-01-15', 'KET OPNAME': '', SITE: 'SJA1' },
            { BARCODE: '10001', RUANGAN: 'B2', KETERANGAN: 'Pinjam', KONDISI: 'Baik', TRANS_DATE: '2024-06-01', 'KET OPNAME': '', SITE: 'SJA1' },
            { BARCODE: '10002', RUANGAN: 'C3', KETERANGAN: '', KONDISI: 'Rusak', TRANS_DATE: '2024-03-10', 'KET OPNAME': 'NOTE', SITE: 'SJA2' },
        ]);
        const map = parseHistoryDatabase(buffer);
        expect(map).toBeInstanceOf(Map);
        expect(map.get('10001')).toHaveLength(2);
        expect(map.get('10002')).toHaveLength(1);
    });

    it('should map correct fields', () => {
        const buffer = createMockHistoryWorkbook([
            { BARCODE: '10001', RUANGAN: 'A1', KETERANGAN: 'Pindah', KONDISI: 'Baik', TRANS_DATE: '2024-01-15', 'KET OPNAME': 'Note1', SITE: 'SJA1' },
        ]);
        const map = parseHistoryDatabase(buffer);
        const records = map.get('10001');
        expect(records[0].ruangan).toBe('A1');
        expect(records[0].keterangan).toBe('Pindah');
        expect(records[0].kondisi).toBe('Baik');
        expect(records[0].ketOpname).toBe('Note1');
        expect(records[0].site).toBe('SJA1');
    });

    it('should skip rows without barcode', () => {
        const buffer = createMockHistoryWorkbook([
            { BARCODE: '', RUANGAN: 'A1', KETERANGAN: '', KONDISI: '', TRANS_DATE: '', 'KET OPNAME': '', SITE: '' },
            { BARCODE: '10002', RUANGAN: 'C3', KETERANGAN: '', KONDISI: '', TRANS_DATE: '', 'KET OPNAME': '', SITE: '' },
        ]);
        const map = parseHistoryDatabase(buffer);
        expect(map.size).toBe(1);
    });
});

describe('lookupBarcodeHistory', () => {
    it('should return records for existing barcode', () => {
        const map = new Map([['10001', [{ ruangan: 'A1' }]]]);
        expect(lookupBarcodeHistory(map, '10001')).toHaveLength(1);
    });

    it('should return empty array for missing barcode', () => {
        const map = new Map([['10001', [{ ruangan: 'A1' }]]]);
        expect(lookupBarcodeHistory(map, '99999')).toEqual([]);
    });

    it('should handle null/empty inputs', () => {
        expect(lookupBarcodeHistory(null, '10001')).toEqual([]);
        expect(lookupBarcodeHistory(new Map(), null)).toEqual([]);
        expect(lookupBarcodeHistory(new Map(), '')).toEqual([]);
    });
});
