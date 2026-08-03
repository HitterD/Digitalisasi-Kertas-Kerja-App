import { describe, expect, it } from 'vitest';
import {
  ROOM_NAV_ELLIPSIS,
  getRoomName,
  getRoomProgressText,
  getRoomSearchText,
  getRoomStatus,
  getRoomStatusDescription,
  getRoomStatusMeta,
  getVisibleRoomItems,
} from '../utils/opnameRoomNav';

describe('opnameRoomNav', () => {
  it('returns empty preview when total room count is zero', () => {
    expect(getVisibleRoomItems(0, 0)).toEqual([]);
  });

  it('shows all rooms without ellipsis when room count is small', () => {
    expect(getVisibleRoomItems(2, 5)).toEqual([
      { type: 'room', index: 0 },
      { type: 'room', index: 1 },
      { type: 'room', index: 2 },
      { type: 'room', index: 3 },
      { type: 'room', index: 4 },
    ]);
  });

  it('shows first room, middle window, and last room for a long list', () => {
    expect(getVisibleRoomItems(11, 80)).toEqual([
      { type: 'room', index: 0 },
      { type: ROOM_NAV_ELLIPSIS, key: 'start' },
      { type: 'room', index: 9 },
      { type: 'room', index: 10 },
      { type: 'room', index: 11 },
      { type: 'room', index: 12 },
      { type: 'room', index: 13 },
      { type: ROOM_NAV_ELLIPSIS, key: 'end' },
      { type: 'room', index: 79 },
    ]);
  });

  it('keeps beginning rooms visible without duplicate first room', () => {
    expect(getVisibleRoomItems(1, 12)).toEqual([
      { type: 'room', index: 0 },
      { type: 'room', index: 1 },
      { type: 'room', index: 2 },
      { type: 'room', index: 3 },
      { type: ROOM_NAV_ELLIPSIS, key: 'end' },
      { type: 'room', index: 11 },
    ]);
  });

  it('keeps ending rooms visible without duplicate last room', () => {
    expect(getVisibleRoomItems(10, 12)).toEqual([
      { type: 'room', index: 0 },
      { type: ROOM_NAV_ELLIPSIS, key: 'start' },
      { type: 'room', index: 8 },
      { type: 'room', index: 9 },
      { type: 'room', index: 10 },
      { type: 'room', index: 11 },
    ]);
  });

  it('maps room progress to done, progress, and empty states', () => {
    expect(getRoomStatus({ checked: 10, total: 10 })).toBe('done');
    expect(getRoomStatus({ checked: 4, total: 10 })).toBe('progress');
    expect(getRoomStatus({ checked: 0, total: 10 })).toBe('empty');
    expect(getRoomStatus({ checked: 0, total: 0 })).toBe('empty');
    expect(getRoomStatus(undefined)).toBe('empty');
  });

  it('gets room name from metadata, sheet name, then fallback', () => {
    expect(getRoomName({ meta: { roomName: 'Ruang QA' }, sheetName: 'Sheet A' }, 0)).toBe('Ruang QA');
    expect(getRoomName({ meta: {}, sheetName: 'Sheet B' }, 1)).toBe('Sheet B');
    expect(getRoomName({}, 2)).toBe('Ruangan 3');
  });

  it('formats progress text with zero fallback', () => {
    expect(getRoomProgressText({ checked: 8, total: 12 })).toBe('8/12');
    expect(getRoomProgressText(undefined)).toBe('0/0');
  });

  it('returns visible metadata for every status', () => {
    expect(getRoomStatusMeta('done')).toEqual({ label: 'Selesai', icon: '✓' });
    expect(getRoomStatusMeta('progress')).toEqual({ label: 'Proses', icon: '…' });
    expect(getRoomStatusMeta('empty')).toEqual({ label: 'Belum', icon: '○' });
    expect(getRoomStatusMeta('unknown')).toEqual({ label: 'Belum', icon: '○' });
  });

  it('describes room status for operator-friendly copy', () => {
    expect(getRoomStatusDescription({ checked: 10, total: 10 }, 'done')).toBe('Semua aset sudah teropname');
    expect(getRoomStatusDescription({ checked: 4, total: 10 }, 'progress')).toBe('6 aset belum dicek');
    expect(getRoomStatusDescription({ checked: 0, total: 10 }, 'empty')).toBe('Belum mulai opname');
    expect(getRoomStatusDescription({ checked: 0, total: 0 }, 'empty')).toBe('Belum ada aset di ruangan ini');
  });

  it('creates searchable text from room number, room name, status, and progress', () => {
    const text = getRoomSearchText({
      room: { meta: { roomName: 'Ruang Packing' }, sheetName: 'Sheet 1' },
      index: 4,
      progress: { checked: 5, total: 8 },
    });

    expect(text).toContain('5');
    expect(text).toContain('ruang packing');
    expect(text).toContain('proses');
    expect(text).toContain('5/8');
  });
});
