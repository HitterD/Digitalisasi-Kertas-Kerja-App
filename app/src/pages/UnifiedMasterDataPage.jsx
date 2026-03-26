import React, { useState } from 'react';
import {ArrowLeft, Database, ClipboardCheck, Settings2} from 'lucide-react';
import { Link } from 'react-router-dom';
import App3ConsolidationPage from './App3ConsolidationPage';
import App4RecouncilPage from './App4RecouncilPage';

export default function UnifiedMasterDataPage() {
    const [activeTab, setActiveTab] = useState('master'); // 'master' | 'recouncil'

    return (
        <div className="app-main theme-clean-glass" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 0, maxWidth: '100%' }}>
            {/* Global Brutalist Header */}
            <header className="app-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
                padding: 'var(--space-3) var(--space-5)', borderBottom: '3px solid var(--charcoal-900)'
            }}>
                <div className="app-header__left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link to="/" className="btn btn--icon" title="Kembali ke Dashboard" style={{
                        background: '#fff', border: '2px solid var(--charcoal-900)', color: 'var(--charcoal-900)',
                        boxShadow: '2px 2px 0px var(--charcoal-900)', borderRadius: '0'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translate(1px, 1px)'; e.currentTarget.style.boxShadow = '1px 1px 0px var(--charcoal-900)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translate(0px, 0px)'; e.currentTarget.style.boxShadow = '2px 2px 0px var(--charcoal-900)'; }}
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} />
                    </Link>
                    <div style={{ width: '2px', height: '24px', background: 'var(--charcoal-900)' }}></div>
                    <div className="app-header__brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 36, height: 36, background: 'var(--amber-400)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: 'var(--charcoal-900)',
                            border: '2px solid var(--charcoal-900)'
                        }}>
                            <Settings2 size={20} strokeWidth={2.5} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h1 style={{ fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '16px', color: 'var(--charcoal-900)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Master Data & Recouncil</h1>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '10px', color: 'var(--charcoal-500)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Consolidation & Evaluation Module</span>
                        </div>
                    </div>
                </div>

                {/* Center / Right: Tabs */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setActiveTab('master')}
                        style={{
                            background: activeTab === 'master' ? 'var(--charcoal-900)' : 'transparent',
                            color: activeTab === 'master' ? 'var(--amber-400)' : 'var(--charcoal-900)',
                            border: '2px solid var(--charcoal-900)', borderRadius: '0',
                            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px',
                            fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '11px',
                            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                            transition: 'all 0.1s',
                            boxShadow: activeTab === 'master' ? '2px 2px 0px var(--amber-400)' : '4px 4px 0px var(--charcoal-900)',
                            transform: activeTab === 'master' ? 'translate(2px, 2px)' : 'translate(0, 0)'
                        }}
                    >
                        <Database size={16} strokeWidth={2.5} />
                        <span>TAHAP 1: CONSOLIDATION</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('recouncil')}
                        style={{
                            background: activeTab === 'recouncil' ? 'var(--charcoal-900)' : 'transparent',
                            color: activeTab === 'recouncil' ? 'var(--amber-400)' : 'var(--charcoal-900)',
                            border: '2px solid var(--charcoal-900)', borderRadius: '0',
                            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px',
                            fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '11px',
                            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                            transition: 'all 0.1s',
                            boxShadow: activeTab === 'recouncil' ? '2px 2px 0px var(--amber-400)' : '4px 4px 0px var(--charcoal-900)',
                            transform: activeTab === 'recouncil' ? 'translate(2px, 2px)' : 'translate(0, 0)'
                        }}
                    >
                        <ClipboardCheck size={16} strokeWidth={2.5} />
                        <span>TAHAP 2: EVALUATION</span>
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
