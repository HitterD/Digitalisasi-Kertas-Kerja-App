import React, { useState } from 'react';
import { ArrowLeft, Box, ClipboardCheck, ArrowRight, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ExtractOpnamePage from './ExtractOpnamePage';
import App4RecouncilPage from './App4RecouncilPage';

export default function UnifiedPostOpnamePage() {
    const [activeTab, setActiveTab] = useState('extract'); // 'extract' | 'recouncil'

    return (
        <div className="unified-opname-page min-h-screen bg-slate-50 flex flex-col">
            {/* Unified Header */}
            <header className="app-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div className="app-header__left flex items-center gap-4 px-6 py-4">
                    <Link to="/" className="app-header__back text-white hover:text-blue-400 transition-colors" title="Kembali ke Menu">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="w-px h-6 bg-slate-700"></div>
                    <div className="flex items-center gap-3 text-white">
                        <Settings2 size={24} className="text-blue-400" />
                        <div>
                            <h1 className="text-lg font-bold leading-tight">Post-Opname Intelligence</h1>
                            <p className="text-xs text-slate-400 font-medium">Extract & Recouncil Integration</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* In-Page Tab Navigation */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 shadow-sm sticky top-[68px] z-40">
                <div className="max-w-6xl mx-auto flex gap-4">
                    <button
                        onClick={() => setActiveTab('extract')}
                        className={`flex flex-1 items-center justify-center gap-3 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'extract'
                            ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                    >
                        <Box size={20} />
                        <div>
                            <div className="text-sm">Tahap 1</div>
                            <div className="text-base text-left">Extract Export Opname (App2)</div>
                        </div>
                        {activeTab === 'extract' && <ArrowRight size={18} className="ml-auto opacity-50" />}
                    </button>

                    <button
                        onClick={() => setActiveTab('recouncil')}
                        className={`flex flex-1 items-center justify-center gap-3 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'recouncil'
                            ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                    >
                        <ClipboardCheck size={20} />
                        <div>
                            <div className="text-sm">Tahap 2</div>
                            <div className="text-base text-left">Recouncil Evaluation (App4)</div>
                        </div>
                        {activeTab === 'recouncil' && <ArrowRight size={18} className="ml-auto opacity-50" />}
                    </button>
                </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 overflow-x-hidden">
                <div className={`transition-opacity duration-300 ${activeTab === 'extract' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                    {/* Render App2 page implicitly inside this container */}
                    <ExtractOpnamePage />
                </div>
                <div className={`transition-opacity duration-300 ${activeTab === 'recouncil' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                    {/* Render App4 page implicitly inside this container */}
                    <App4RecouncilPage />
                </div>
            </div>
        </div>
    );
}
