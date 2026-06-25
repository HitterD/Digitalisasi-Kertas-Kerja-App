import { useRef, useEffect, useState, useCallback } from 'react';
import { X, PenLine, Lock, Unlock } from 'lucide-react';

export default function SignaturePad({ item, onUpdate }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const prevTouchRef = useRef(null);

    const { roleLabel, name, image, locked } = item;
    const isEmpty = !image;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height; // Set height via CSS
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1a365d';

        if (image) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = image;
        }
    }, [image, locked]); // Redraw when locked changes to ensure it stays

    const getPos = useCallback((e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }, []);

    const startDrawing = useCallback((e) => {
        if (locked) return;
        e.preventDefault();
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
        prevTouchRef.current = pos;
    }, [getPos, locked]);

    const draw = useCallback((e) => {
        if (!isDrawing || locked) return;
        e.preventDefault();
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        prevTouchRef.current = pos;
    }, [isDrawing, getPos, locked]);

    const stopDrawing = useCallback((e) => {
        if (!isDrawing || locked) return;
        e?.preventDefault();
        setIsDrawing(false);
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        onUpdate({ ...item, image: dataUrl });
    }, [isDrawing, locked, onUpdate, item]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const options = { passive: false };
        canvas.addEventListener('touchstart', startDrawing, options);
        canvas.addEventListener('touchmove', draw, options);
        canvas.addEventListener('touchend', stopDrawing, options);
        return () => {
            canvas.removeEventListener('touchstart', startDrawing, options);
            canvas.removeEventListener('touchmove', draw, options);
            canvas.removeEventListener('touchend', stopDrawing, options);
        };
    }, [startDrawing, draw, stopDrawing]);

    const clearSignature = useCallback(() => {
        if (locked) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        onUpdate({ ...item, image: null });
    }, [locked, onUpdate, item]);

    return (
        <div className="signature-pad" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
                type="text"
                className="form-input"
                value={roleLabel}
                onChange={(e) => onUpdate({ ...item, roleLabel: e.target.value })}
                style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', border: 'none', background: 'transparent', padding: '4px' }}
                placeholder="Label Jabatan"
            />
            
            <div className="signature-pad__canvas-wrap" style={{
                position: 'relative',
                border: locked ? '1px solid var(--border)' : '1px solid var(--terracotta-500)',
                backgroundColor: locked ? 'var(--neutral-50)' : '#FFFFFF',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                height: '280px',
                opacity: locked ? 0.8 : 1
            }}>
                {isEmpty && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-300)', pointerEvents: 'none' }}>
                        <PenLine size={32} />
                    </div>
                )}
                {locked && (
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--charcoal-900)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: 10, fontWeight: 600 }}>
                        <Lock size={10} /> Locked
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    className="signature-pad__canvas"
                    style={{ border: 'none', background: 'transparent', width: '100%', height: '100%', cursor: locked ? 'not-allowed' : 'crosshair' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    className={`btn btn--sm ${locked ? 'btn--ghost' : 'btn--outline'}`}
                    onClick={() => onUpdate({ ...item, locked: !locked })}
                    style={{ minHeight: '32px', padding: '0 12px', flex: 1, marginRight: isEmpty ? 0 : 8 }}
                >
                    {locked ? <><Unlock size={14} style={{ marginRight: '4px' }} /> Unlock</> : <><Lock size={14} style={{ marginRight: '4px' }} /> Lock</>}
                </button>
                
                {!isEmpty && !locked && (
                    <button
                        className="btn btn--ghost btn--sm text-danger-600 font-semibold"
                        onClick={clearSignature}
                        title="Hapus tanda tangan"
                        style={{ minHeight: '32px', padding: '0 12px', flex: 1 }}
                    >
                        <X size={14} style={{ marginRight: '4px' }} /> Bersihkan
                    </button>
                )}
            </div>

            <input
                type="text"
                className="form-input"
                placeholder="Nama Terang..."
                value={name}
                onChange={(e) => onUpdate({ ...item, name: e.target.value })}
                style={{ textAlign: 'center', fontWeight: 600, marginTop: '4px' }}
            />
        </div>
    );
}
