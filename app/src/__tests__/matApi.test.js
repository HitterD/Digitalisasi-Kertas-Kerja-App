import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiConfig sebelum import matApi
vi.mock('../utils/apiConfig', () => ({
  apiUrl: (path) => `http://localhost:5173${path}`,
  fetchWithAuth: vi.fn(),
}));

import { fetchMatHistory } from '../utils/matApi';
import * as apiConfig from '../utils/apiConfig';

describe('fetchMatHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches MAT history and returns parsed response', async () => {
    const mockResponse = {
      success: true,
      barcode: '10001',
      hasActiveMAT: true,
      count: 1,
      data: [
        {
          TRXID: 1,
          NO_MAT: 'MAT-001',
          STATUS: 'PENDING',
          ASAL_RUANGAN_ID: 'RUANG-A',
          TUJUAN_RUANGAN_ID: 'RUANG-B',
        },
      ],
      timestamp: '2026-04-14T00:00:00.000Z',
    };
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchMatHistory('10001');

    expect(apiConfig.fetchWithAuth).toHaveBeenCalledWith(
      'http://localhost:5173/api/db/mat-history/10001',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.hasActiveMAT).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].ASAL_RUANGAN_ID).toBe('RUANG-A');
  });

  it('throws error with server message when response is not ok', async () => {
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Query gagal' }),
    });

    await expect(fetchMatHistory('99999')).rejects.toThrow('Query gagal');
  });

  it('throws HTTP status when server returns no error message', async () => {
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    });

    await expect(fetchMatHistory('99999')).rejects.toThrow('HTTP 503');
  });

  it('URL-encodes barcode with special characters', async () => {
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          barcode: 'A/1',
          hasActiveMAT: false,
          count: 0,
          data: [],
          timestamp: '',
        }),
    });

    await fetchMatHistory('A/1');

    expect(apiConfig.fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining('A%2F1'),
      expect.any(Object)
    );
  });
});