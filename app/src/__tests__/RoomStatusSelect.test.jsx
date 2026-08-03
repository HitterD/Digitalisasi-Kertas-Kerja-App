import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RoomStatusSelect from '../components/RoomStatusSelect';

const rooms = [
  { meta: { roomName: 'RUANG 801 PACKING' }, sheetName: 'Sheet 801' },
  { meta: { roomName: 'RUANG 806 TRANSIT BARANG' }, sheetName: 'Sheet 806' },
  { meta: { roomName: 'RUANG 910 PACKING LINE 3' }, sheetName: 'Sheet 910' },
];

const progress = [
  { checked: 18, total: 18 },
  { checked: 9, total: 13 },
  { checked: 0, total: 1 },
];

function renderSelect(props = {}) {
  const onChange = vi.fn();
  render(
    <RoomStatusSelect
      rooms={rooms}
      progress={progress}
      value={0}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange };
}

describe('RoomStatusSelect', () => {
  it('renders active room with explicit done status', () => {
    renderSelect();

    expect(screen.getByRole('button', { name: /pilih ruangan opname/i })).toHaveTextContent('RUANG 801 PACKING');
    expect(screen.getByText('Selesai')).toBeInTheDocument();
    expect(screen.getByText('18/18')).toBeInTheDocument();
  });

  it('opens dropdown and shows all status labels', () => {
    renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));

    expect(screen.getByRole('searchbox', { name: /cari ruangan/i })).toBeInTheDocument();
    expect(screen.getAllByText('Selesai').length).toBeGreaterThan(0);
    expect(screen.getByText('Proses')).toBeInTheDocument();
    expect(screen.getByText('Belum')).toBeInTheDocument();
    expect(screen.getByText('4 aset belum dicek')).toBeInTheDocument();
  });

  it('filters rooms by room name', () => {
    renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));
    fireEvent.change(screen.getByRole('searchbox', { name: /cari ruangan/i }), {
      target: { value: 'transit' },
    });

    expect(screen.getByText(/RUANG 806 TRANSIT BARANG/)).toBeInTheDocument();
    expect(screen.queryByText(/RUANG 910 PACKING LINE 3/)).not.toBeInTheDocument();
  });

  it('filters rooms by status text', () => {
    renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));
    fireEvent.change(screen.getByRole('searchbox', { name: /cari ruangan/i }), {
      target: { value: 'belum' },
    });

    expect(screen.getByText(/RUANG 910 PACKING LINE 3/)).toBeInTheDocument();
    expect(screen.queryByText(/RUANG 806 TRANSIT BARANG/)).not.toBeInTheDocument();
  });

  it('selects room and closes dropdown', () => {
    const { onChange } = renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));
    fireEvent.click(screen.getByRole('option', { name: /RUANG 806 TRANSIT BARANG/i }));

    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('searchbox', { name: /cari ruangan/i })).not.toBeInTheDocument();
  });

  it('closes dropdown with Escape', () => {
    renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));
    expect(screen.getByRole('searchbox', { name: /cari ruangan/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('searchbox', { name: /cari ruangan/i })).not.toBeInTheDocument();
  });

  it('renders disabled empty state when there are no rooms', () => {
    renderSelect({ rooms: [], progress: [], value: 0 });

    const trigger = screen.getByRole('button', { name: /pilih ruangan opname/i });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent('Tidak ada ruangan');
  });
});
