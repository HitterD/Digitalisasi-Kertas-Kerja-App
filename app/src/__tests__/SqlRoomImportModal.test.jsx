import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SqlRoomImportModal from '../components/SqlRoomImportModal';

const roomsResponse = {
  success: true,
  data: [
    { NAMA_RUANGAN: 'RUANG SERVER', PIC_RUANGAN: 'BUDI', RUANGAN_ID: 11, ASSET_COUNT: 3 },
  ],
};

const assetsResponse = {
  success: true,
  data: [
    { BARCODE_ASSET: '1300000001', NAMA_ASSET: 'LAPTOP', CREATE_USER: 'ICT_ADMIN', NAMA_RUANGAN: 'RUANG SERVER', NAMA_KONDISI: 'Baik' },
    { BARCODE_ASSET: '1300000002', NAMA_ASSET: 'MONITOR', CREATE_USER: '', NAMA_RUANGAN: 'RUANG SERVER', NAMA_KONDISI: 'Baik' },
    { BARCODE_ASSET: '1300000003', NAMA_ASSET: 'PANEL', CREATE_USER: 'ENG_USER', NAMA_RUANGAN: 'RUANG SERVER', NAMA_KONDISI: 'Baik' },
  ],
};

function mockFetchOnce() {
  global.fetch = vi.fn((url) => {
    const value = String(url);
    if (value.includes('/api/db/rooms/RUANG%20SERVER/assets?owner=ICT')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(assetsResponse) });
    }
    if (value.includes('/api/db/rooms')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(roomsResponse) });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ success: false }) });
  });
}

describe('SqlRoomImportModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetchOnce();
  });

  it('loads rooms with relative API URL and imports only included assets after review', async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(<SqlRoomImportModal isOpen onClose={onClose} onImport={onImport} existingRooms={[]} />);

    const input = await screen.findByPlaceholderText('Ketik nama atau kode ruang SQL...');
    fireEvent.focus(input);
    fireEvent.change(input, {
      target: { value: 'SERVER' },
    });

    const option = await screen.findByText('RUANG SERVER');
    fireEvent.click(option);
    fireEvent.click(screen.getByText('ICT'));
    fireEvent.click(screen.getByRole('button', { name: /Lanjut Review Aset/i }));

    await screen.findByText(/Review: RUANG SERVER/i);

    expect(global.fetch).toHaveBeenCalledWith('/api/db/rooms', expect.anything());
    expect(global.fetch).toHaveBeenCalledWith('/api/db/rooms/RUANG%20SERVER/assets?owner=ICT', expect.anything());
    expect(screen.getByRole('button', { name: /Import 1 Aset ICT/i })).toBeDisabled();

    const reviewTab = screen.getByRole('button', { name: /Perlu Review/i });
    fireEvent.click(reviewTab);

    fireEvent.click(screen.getByTitle('Masuk ICT'));

    await waitFor(() => expect(screen.getByRole('button', { name: /Import 2 Aset ICT/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /Import 2 Aset ICT/i }));

    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({
      roomName: 'RUANG SERVER',
      sqlCategory: 'ICT',
      appendIfExist: true,
    }));
    expect(onImport.mock.calls[0][0].assets).toHaveLength(2);
    expect(onImport.mock.calls[0][0].assets.every((asset) => asset.isChecked === false)).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state and disables import when selected room has no assets', async () => {
    global.fetch = vi.fn((url) => {
      const value = String(url);
      if (value.includes('/assets?owner=ICT')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(roomsResponse) });
    });

    render(<SqlRoomImportModal isOpen onClose={vi.fn()} onImport={vi.fn()} existingRooms={[]} />);

    const input = await screen.findByPlaceholderText('Ketik nama atau kode ruang SQL...');
    fireEvent.focus(input);
    const option = await screen.findByText('RUANG SERVER');
    fireEvent.click(option);
    fireEvent.click(screen.getByText('ICT'));
    fireEvent.click(screen.getByRole('button', { name: /Lanjut Review Aset/i }));

    expect(await screen.findByText('Tidak ada aset di tab ini.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import 0 Aset ICT/i })).toBeDisabled();
  });
});
