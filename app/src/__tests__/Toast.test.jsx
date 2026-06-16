import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from '../components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message', () => {
    render(<Toast type="success" message="Saved" onClose={() => {}} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('applies type class', () => {
    const { container } = render(<Toast type="danger" message="Error" onClose={() => {}} />);
    expect(container.querySelector('.wa-toast--danger')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', () => {
    const onClose = vi.fn();
    render(<Toast type="success" message="Hi" duration={1000} onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss when duration is 0', () => {
    const onClose = vi.fn();
    render(<Toast type="success" message="Hi" duration={0} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
