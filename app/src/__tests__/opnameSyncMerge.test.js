// app/src/__tests__/opnameSyncMerge.test.js
import { describe, it, expect } from 'vitest';
import { mergeOpnameResult } from '../utils/opnameSyncMerge';

const makeRoom = (name, assets) => ({
  sheetName: name,
  meta: { roomName: name, period: '2026-06' },
  assets,
  noBarcodeAssets: [],
  notAtLocationAssets: [],
  signatures: {},
});

const makeAsset = (barcode, fields = {}) => ({
  id: `asset-${barcode}`,
  barcode,
  namaAset: '',
  isChecked: false,
  kondisi: '',
  keterangan: '',
  updatedAt: null,
  ...fields,
});

describe('mergeOpnameResult', () => {
  it('should keep local-only changes (no remote counterpart)', () => {
    const local = {
      rooms: [makeRoom('R1', [makeAsset('001', { kondisi: 'Baik', updatedAt: '2026-06-26T10:00:00Z' })])],
    };
    const remote = {
      rooms: [makeRoom('R1', [makeAsset('001', { kondisi: '', updatedAt: null })])],
    };
    const { merged, conflicts } = mergeOpnameResult(local, remote);
    expect(merged.rooms[0].assets[0].kondisi).toBe('Baik');
    expect(conflicts).toHaveLength(0);
  });

  it('should take remote-only changes', () => {
    const local = {
      rooms: [makeRoom('R1', [makeAsset('001', { kondisi: '', updatedAt: null })])],
    };
    const remote = {
      rooms: [makeRoom('R1', [makeAsset('001', { kondisi: 'Rusak', updatedAt: '2026-06-26T10:00:00Z' })])],
    };
    const { merged, conflicts } = mergeOpnameResult(local, remote);
    expect(merged.rooms[0].assets[0].kondisi).toBe('Rusak');
    expect(conflicts).toHaveLength(0);
  });

  it('should pick the latest updatedAt when both changed the same field (last-write-wins)', () => {
    const local = {
      rooms: [makeRoom('R1', [makeAsset('001', { kondisi: 'Baik', updatedAt: '2026-06-26T10:05:00Z' })])],
    };
    const remote = {
      rooms: [makeRoom('R1', [makeAsset('001', { kondisi: 'Rusak', updatedAt: '2026-06-26T10:10:00Z' })])],
    };
    const { merged, conflicts } = mergeOpnameResult(local, remote);
    expect(merged.rooms[0].assets[0].kondisi).toBe('Rusak'); // remote wins
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].winner).toBe('remote');
    expect(conflicts[0].field).toBe('kondisi');
  });

  it('should record conflict with local winning when local is newer', () => {
    const local = {
      rooms: [makeRoom('R1', [makeAsset('001', { kondisi: 'Baik', updatedAt: '2026-06-26T11:00:00Z' })])],
    };
    const remote = {
      rooms: [makeRoom('R1', [makeAsset('001', { kondisi: 'Rusak', updatedAt: '2026-06-26T10:00:00Z' })])],
    };
    const { merged, conflicts } = mergeOpnameResult(local, remote);
    expect(merged.rooms[0].assets[0].kondisi).toBe('Baik'); // local wins
    expect(conflicts[0].winner).toBe('local');
  });

  it('should handle rooms only in local (not in remote)', () => {
    const local = {
      rooms: [makeRoom('R1', [makeAsset('001')]), makeRoom('R2', [makeAsset('002')])],
    };
    const remote = {
      rooms: [makeRoom('R1', [makeAsset('001')])],
    };
    const { merged } = mergeOpnameResult(local, remote);
    expect(merged.rooms).toHaveLength(2);
  });

  it('should handle rooms only in remote (not in local)', () => {
    const local = {
      rooms: [makeRoom('R1', [makeAsset('001')])],
    };
    const remote = {
      rooms: [makeRoom('R1', [makeAsset('001')]), makeRoom('R3', [makeAsset('003')])],
    };
    const { merged } = mergeOpnameResult(local, remote);
    expect(merged.rooms).toHaveLength(2);
  });

  it('should handle assets only in remote (append to room)', () => {
    const local = {
      rooms: [makeRoom('R1', [makeAsset('001')])],
    };
    const remote = {
      rooms: [makeRoom('R1', [makeAsset('001'), makeAsset('099', { kondisi: 'Baik', updatedAt: '2026-06-26T10:00:00Z' })])],
    };
    const { merged } = mergeOpnameResult(local, remote);
    expect(merged.rooms[0].assets).toHaveLength(2);
    expect(merged.rooms[0].assets[1].barcode).toBe('099');
  });

  it('should merge noBarcodeAssets by id', () => {
    const local = {
      rooms: [{
        ...makeRoom('R1', []),
        noBarcodeAssets: [{ id: 'nb-1', namaAset: 'Keyboard', updatedAt: '2026-06-26T10:00:00Z' }],
      }],
    };
    const remote = {
      rooms: [{
        ...makeRoom('R1', []),
        noBarcodeAssets: [{ id: 'nb-1', namaAset: 'Keyboard Edit', updatedAt: '2026-06-26T11:00:00Z' }],
      }],
    };
    const { merged } = mergeOpnameResult(local, remote);
    expect(merged.rooms[0].noBarcodeAssets[0].namaAset).toBe('Keyboard Edit');
  });

  it('should return empty conflicts when nothing conflicts', () => {
    const local = { rooms: [] };
    const remote = { rooms: [] };
    const { conflicts } = mergeOpnameResult(local, remote);
    expect(conflicts).toEqual([]);
  });

  it('should merge renamed signature headers from remote', () => {
    const localRoom = makeRoom('Sheet1', []);
    localRoom.signatures = [{ id: 'pic', roleLabel: 'PIC RUANGAN', name: 'A', updatedAt: '2026-06-26T10:00:00Z' }];
    const remoteRoom = makeRoom('Sheet1', []);
    remoteRoom.signatures = [{ id: 'pic', roleLabel: 'PENANGGUNG JAWAB', name: 'A', updatedAt: '2026-06-26T11:00:00Z' }];

    const { merged } = mergeOpnameResult({ rooms: [localRoom] }, { rooms: [remoteRoom] });

    expect(merged.rooms[0].signatures[0].roleLabel).toBe('PENANGGUNG JAWAB');
  });

  it('should merge signature object payloads from older saved data', () => {
    const localRoom = makeRoom('Sheet1', []);
    localRoom.signatures = [{ id: 'pic-ruangan', roleLabel: 'PIC RUANGAN', name: '', image: null, locked: false }];
    const remoteRoom = makeRoom('Sheet1', []);
    remoteRoom.signatures = { picRuanganName: 'Budi', picRuangan: 'data:image/png;base64,abc' };

    const { merged } = mergeOpnameResult({ rooms: [localRoom] }, { rooms: [remoteRoom] });

    const pic = merged.rooms[0].signatures.find((item) => item.id === 'pic-ruangan');
    expect(pic.name).toBe('Budi');
    expect(pic.image).toBe('data:image/png;base64,abc');
  });

  it('should keep newer local signature fields over older remote fields', () => {
    const localRoom = makeRoom('Sheet1', []);
    localRoom.signatures = [{ id: 'pic', roleLabel: 'PIC BARU', name: 'A', updatedAt: '2026-06-26T11:00:00Z' }];
    const remoteRoom = makeRoom('Sheet1', []);
    remoteRoom.signatures = [{ id: 'pic', roleLabel: 'PIC LAMA', name: 'B', updatedAt: '2026-06-26T10:00:00Z' }];

    const { merged } = mergeOpnameResult({ rooms: [localRoom] }, { rooms: [remoteRoom] });

    expect(merged.rooms[0].signatures[0].roleLabel).toBe('PIC BARU');
    expect(merged.rooms[0].signatures[0].name).toBe('A');
  });

  it('should merge remote no-barcode and wrong-room assets into the room', () => {
    const localRoom = makeRoom('Sheet1', []);
    const remoteRoom = makeRoom('Sheet1', []);
    remoteRoom.noBarcodeAssets = [{ id: 'nb-remote', namaAset: 'Mouse tanpa barcode', updatedAt: '2026-06-26T10:00:00Z' }];
    remoteRoom.notAtLocationAssets = [{ id: 'wrong-room-remote', barcode: '0099', namaAset: 'Monitor', keterangan: 'Salah Ruangan', updatedAt: '2026-06-26T10:00:00Z' }];

    const { merged } = mergeOpnameResult({ rooms: [localRoom] }, { rooms: [remoteRoom] });

    expect(merged.rooms[0].noBarcodeAssets[0].namaAset).toBe('Mouse tanpa barcode');
    expect(merged.rooms[0].notAtLocationAssets[0].barcode).toBe('0099');
  });

  it('should match rooms by stable sheetName when roomName is renamed', () => {
    const localRoom = makeRoom('Sheet1', []);
    localRoom.meta.roomName = 'RUANG LAMA';
    const remoteRoom = makeRoom('Sheet1', []);
    remoteRoom.meta.roomName = 'RUANG BARU';

    const { merged } = mergeOpnameResult({ rooms: [localRoom] }, { rooms: [remoteRoom] });

    expect(merged.rooms).toHaveLength(1);
    expect(merged.rooms[0].meta.roomName).toBe('RUANG BARU');
  });
});
