import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ThemeToggle from '../components/ThemeToggle';

// Mock useTheme hook
const mockUseTheme = vi.fn();
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => mockUseTheme(),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockUseTheme.mockReset();
  });

  it('renders correctly', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', toggle: vi.fn() });
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('clicking the button calls toggle()', () => {
    const toggle = vi.fn();
    mockUseTheme.mockReturnValue({ theme: 'light', toggle });
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('aria-label reflects current state', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', toggle: vi.fn() });
    const { unmount } = render(<ThemeToggle />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/dark mode/i);
    unmount();

    mockUseTheme.mockReturnValue({ theme: 'dark', toggle: vi.fn() });
    render(<ThemeToggle />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/light mode/i);
  });
});
