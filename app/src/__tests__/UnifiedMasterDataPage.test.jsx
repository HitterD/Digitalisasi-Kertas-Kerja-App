import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UnifiedMasterDataPage from '../pages/UnifiedMasterDataPage';

vi.mock('../pages/App3ConsolidationPage', () => ({
  default: () => <div>Consolidation content</div>,
}));

vi.mock('../pages/App4RecouncilPage', () => ({
  default: () => <div>Evaluation content</div>,
}));

vi.mock('../components/ThemeToggle', () => ({
  default: () => <button type="button">Theme toggle</button>,
}));

describe('UnifiedMasterDataPage', () => {
  it('renders App1/App2-style topbar controls', () => {
    render(
      <MemoryRouter>
        <UnifiedMasterDataPage />
      </MemoryRouter>
    );

    const backLink = screen.getByRole('link', { name: /kembali ke menu/i });
    expect(backLink).toHaveAttribute('href', '/');
    expect(backLink.className).toMatch(/umd-back-button/);

    expect(screen.getByText('Master Data')).toBeInTheDocument();
    expect(screen.getByText('Theme toggle')).toBeInTheDocument();
  });

  it('starts on Consolidation tab and switches to Evaluation tab', () => {
    render(
      <MemoryRouter>
        <UnifiedMasterDataPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Consolidation content')).toBeInTheDocument();
    expect(screen.queryByText('Evaluation content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /evaluation/i }));

    expect(screen.getByText('Evaluation content')).toBeInTheDocument();
    expect(screen.queryByText('Consolidation content')).not.toBeInTheDocument();
  });
});
