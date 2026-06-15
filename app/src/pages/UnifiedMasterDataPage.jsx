import React, { useState } from 'react';
import {ArrowLeft, Database, ClipboardCheck, Settings2} from 'lucide-react';
import { Link } from 'react-router-dom';
import App3ConsolidationPage from './App3ConsolidationPage';
import App4RecouncilPage from './App4RecouncilPage';

export default function UnifiedMasterDataPage() {
    const [activeTab, setActiveTab] = useState('master'); // 'master' | 'recouncil'

    return (
        <div className="app-main theme-clean-glass" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 0, maxWidth: '100%' }}>
            {/* Slim Atelier Header */}
            <header className="wa-app-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
                padding: '12px 24px', borderBottom: '1px solid rgba(26,26,26,0.08)', background: 'var(--cream-surface)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link to="/" title="Kembali ke Dashboard" style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, background: 'var(--cream-input)', color: 'var(--charcoal-500)',
                        border: '1px solid rgba(26,26,26,0.08)', borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none', transition: 'all 180ms ease'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--charcoal-900)'; e.currentTarget.style.color = 'var(--cream-surface)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'var(--cream-input)'; e.currentTarget.style.color = 'var(--charcoal-500)'; }}
                    >
                        <ArrowLeft size={16} strokeWidth={2.5} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: 32, height: 32, background: 'var(--charcoal-900)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: 'var(--terracotta-500)',
                            borderRadius: 'var(--radius-sm)'
                        }}>
                            <Settings2 size={16} strokeWidth={2.5} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <span style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: '13px', color: 'var(--charcoal-900)', letterSpacing: '0.02em' }}>Master Data & Recouncil</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '9px', color: 'var(--charcoal-500)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KKD · Final Evaluation Module</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="wa-tabs" style={{ display: 'flex', gap: 0, borderBottom: 'none' }}>
                    <button
                        onClick={() => setActiveTab('master')}
                        className={activeTab === 'master' ? 'wa-tab active' : 'wa-tab'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontFamily: 'var(--font-sora)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: activeTab === 'master' ? 'var(--charcoal-900)' : 'var(--charcoal-500)', transition: 'all 200ms ease' }}
                    >
                        <Database size={14} strokeWidth={2.5} />
                        <span>Consolidation</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('recouncil')}
                        className={activeTab === 'recouncil' ? 'wa-tab active' : 'wa-tab'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontFamily: 'var(--font-sora)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: activeTab === 'recouncil' ? 'var(--charcoal-900)' : 'var(--charcoal-500)', transition: 'all 200ms ease' }}
                    >
                        <ClipboardCheck size={14} strokeWidth={2.5} />
                        <span>Evaluation</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: activeTab === 'master' ? 'block' : 'none' }}>
                    <App3ConsolidationPage />
                </div>

                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: activeTab === 'recouncil' ? 'block' : 'none' }}>
                    <App4RecouncilPage />
                </div>
            </main>
        </div>
    );
}
