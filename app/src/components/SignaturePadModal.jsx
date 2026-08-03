import { useRef, useState, useEffect } from 'react';
import { X, Eraser, Check, RotateCcw } from 'lucide-react';

export default function SignaturePadModal({ isOpen, onClose, onSave, title = 'Tanda Tangan Digital' }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const historyRef = useRef([]);

    useEffect(() => {
        if (isOpen) {
            setIsEmpty(true);
            historyRef.current = [];
            setTimeout(initCanvas, 50);
        }
    }, [isOpen]);

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        // Adjust display DPI
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Fill white background for clean PNG export
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        saveHistory();
    };

    const saveHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (historyRef.current.length > 10) historyRef.current.shift();
        historyRef.current.push(canvas.toDataURL());
    };

    const getPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        if (e.touches && e.touches[0]) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e);

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
        setIsEmpty(false);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e);

        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveHistory();
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        setIsEmpty(true);
        historyRef.current = [canvas.toDataURL()];
    };

    const handleUndo = () => {
        if (historyRef.current.length <= 1) {
            handleClear();
            return;
        }
        historyRef.current.pop();
        const previousState = historyRef.current[historyRef.current.length - 1];

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = previousState;
        img.onload = () => {
            const rect = canvas.getBoundingClientRect();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, rect.width, rect.height);
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas || isEmpty) return;
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: 16
        }}>
            <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: 12,
                width: '100%',
                maxWidth: 520,
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                animation: 'modalFadeIn 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-input)'
                }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                        {title}
                    </div>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body Canvas */}
                <div style={{ padding: 20 }}>
                    <div style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        marginBottom: 10,
                        fontWeight: 500
                    }}>
                        Gunakan mouse atau layar sentuh untuk membubuhkan tanda tangan di area berikut:
                    </div>

                    <div style={{
                        border: '2px dashed var(--border)',
                        borderRadius: 8,
                        backgroundColor: '#ffffff',
                        cursor: 'crosshair',
                        touchAction: 'none',
                        position: 'relative'
                    }}>
                        <canvas
                            ref={canvasRef}
                            style={{ width: '100%', height: 220, display: 'block', borderRadius: 6 }}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />

                        {isEmpty && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                opacity: 0.4,
                                fontSize: 13,
                                color: '#64748b',
                                fontWeight: 500
                            }}>
                                Tanda tangan di sini...
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderTop: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-input)'
                }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="wa-btn-ghost"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
                        >
                            <Eraser size={14} /> Bersihkan
                        </button>
                        <button
                            type="button"
                            onClick={handleUndo}
                            className="wa-btn-ghost"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
                        >
                            <RotateCcw size={14} /> Undo
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={onClose} className="wa-btn-ghost" style={{ fontSize: 13 }}>
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isEmpty}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 16px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: isEmpty ? 'var(--border)' : 'var(--accent)',
                                color: isEmpty ? 'var(--text-tertiary)' : '#ffffff',
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: isEmpty ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Check size={16} /> Simpan Tanda Tangan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
