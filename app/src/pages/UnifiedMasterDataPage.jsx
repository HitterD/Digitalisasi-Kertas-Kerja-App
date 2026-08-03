import { useState } from 'react';
import { ArrowLeft, ClipboardCheck, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import App3ConsolidationPage from './App3ConsolidationPage';
import App4RecouncilPage from './App4RecouncilPage';

export default function UnifiedMasterDataPage() {
  const [activeTab, setActiveTab] = useState('master');
  const isMaster = activeTab === 'master';

  return (
    <div className="umd-shell">
      <header className="wa-app-header umd-header">
        <div className="umd-header-left">
          <Link to="/" aria-label="Kembali ke menu" className="umd-back-button">
            <ArrowLeft size={18} />
          </Link>
          <div className="umd-header-divider" />
          <div className="umd-brand">
            <div className="umd-brand-icon">
              <Database size={18} />
            </div>
            <div className="umd-brand-title">Master Data</div>
          </div>
        </div>

        <div className="umd-header-actions">
          <div className="umd-tabs" role="tablist" aria-label="Master data modules">
            <button
              type="button"
              role="tab"
              aria-selected={isMaster}
              className={`umd-tab ${isMaster ? 'active' : ''}`}
              onClick={() => setActiveTab('master')}
            >
              <Database size={14} />
              <span>Consolidation</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isMaster}
              className={`umd-tab ${!isMaster ? 'active' : ''}`}
              onClick={() => setActiveTab('recouncil')}
            >
              <ClipboardCheck size={14} />
              <span>Evaluation</span>
            </button>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="umd-main">
        {isMaster ? <App3ConsolidationPage /> : <App4RecouncilPage />}
      </main>
    </div>
  );
}
