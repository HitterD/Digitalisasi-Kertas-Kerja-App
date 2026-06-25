import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssetTable from '../components/AssetTable';
import { fetchActiveMatByBarcodes } from '../utils/matApi';

vi.mock('../utils/matApi', () => ({
  fetchActiveMatByBarcodes: vi.fn(),
}));

function makeAsset(index, overrides = {}) {
  return {
    id: `asset-${index}`,
    no: String(index),
    barcode: `130000${String(index).padStart(2, '0')}`,
    namaAset: `Asset ${index}`,
    noPO: '',
    tipe: '',
    bulanPerolehan: '',
    tahunPerolehan: '',
    adaTidakAda: '',
    kondisi: '',
    keterangan: '',
    isChecked: false,
    ...overrides,
  };
}

function renderTable(assets) {
  render(
    <AssetTable
      assets={assets}
      roomIndex={0}
      onToggleCheck={vi.fn()}
      onUpdateField={vi.fn()}
      masterDb={null}
      onAutofill={vi.fn()}
      searchQuery=""
    />
  );
}

describe('AssetTable MAT badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchActiveMatByBarcodes.mockResolvedValue({ success: true, count: 0, data: {}, timestamp: '' });
  });

  it('renders process MAT badge and next role for active MAT asset', async () => {
    fetchActiveMatByBarcodes.mockResolvedValueOnce({
      success: true,
      count: 1,
      data: {
        '13000042': {
          noMat: 'MAT-0241',
          status: 'WAITING_APPROVAL',
          nextRoleVerificator: 'GA Manager',
          nextVerificator: 'BUDI',
        },
      },
      timestamp: '2026-06-25T00:00:00.000Z',
    });

    renderTable([
      makeAsset(42, { barcode: '13000042', namaAset: 'Laptop Lenovo ThinkPad' }),
      makeAsset(43, { barcode: '13000043', namaAset: 'Monitor Dell' }),
    ]);

    expect(await screen.findAllByText(/proses MAT · MAT-0241/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/next: GA Manager/i)).not.toHaveLength(0);
    expect(screen.queryByText(/MAT-9999/i)).not.toBeInTheDocument();
  });

  it('fetches only barcodes from the active pagination page', async () => {
    const assets = Array.from({ length: 21 }, (_, index) => makeAsset(index + 1));

    renderTable(assets);

    await waitFor(() => expect(fetchActiveMatByBarcodes).toHaveBeenCalled());
    const calledBarcodes = fetchActiveMatByBarcodes.mock.calls[0][0];

    expect(calledBarcodes).toHaveLength(20);
    expect(calledBarcodes).toContain('13000001');
    expect(calledBarcodes).toContain('13000020');
    expect(calledBarcodes).not.toContain('13000021');
  });

  it('does not render badge for asset without active MAT data', async () => {
    renderTable([
      makeAsset(1, { barcode: '13000001', namaAset: 'Asset Without MAT' }),
    ]);

    await waitFor(() => expect(fetchActiveMatByBarcodes).toHaveBeenCalled());

    expect(screen.queryByText(/proses MAT/i)).not.toBeInTheDocument();
  });
});
