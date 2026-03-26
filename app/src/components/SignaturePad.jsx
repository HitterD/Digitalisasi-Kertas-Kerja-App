import { useRef, useEffect, useState, useCallback } from 'react';
import { X, PenLine } from 'lucide-react';

export default function SignaturePad({ label, initialData, initialName, onSave, onNameChange }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [namaTerang, setNamaTerang] = useState(initialName || '');
    const prevTouchRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1a365d';

        if (initialData) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                setIsEmpty(false);
            };
            img.src = initialData;
        }
    }, [initialData]);

    useEffect(() => {
        setNamaTerang(initialName || '');
    }, [initialName]);

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
        e.preventDefault();
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
        setIsEmpty(false);
        prevTouchRef.current = pos;
    }, [getPos]);

    const draw = useCallback((e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        prevTouchRef.current = pos;
    }, [isDrawing, getPos]);

    const stopDrawing = useCallback((e) => {
        if (!isDrawing) return;
        e?.preventDefault();
        setIsDrawing(false);
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    }, [isDrawing, onSave]);

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
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onSave(null);
    }, [onSave]);

    const handleNameChange = (e) => {
        const val = e.target.value;
        setNamaTerang(val);
        if (onNameChange) onNameChange(val);
    };

    return (
        <div className="signature-pad">
            <div className="signature-pad__label">{label}</div>
            <div className="signature-pad__canvas-wrap" style={{
                position: 'relative',
                border: '1px solid var(--neutral-200)',
                backgroundColor: 'var(--neutral-50)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden'
            }}>
                {isEmpty && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-300)', pointerEvents: 'none' }}>
                        <PenLine size={32} />
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    className="signature-pad__canvas"
                    style={{ border: 'none', background: 'transparent' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
            </div>
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {!isEmpty && (
                    <button
                        className="btn btn--ghost btn--sm text-danger-600 font-semibold"
                        onClick={clearSignature}
                        title="Hapus tanda tangan"
                        style={{ alignSelf: 'flex-end', minHeight: '36px', padding: '0 12px' }}
                    >
                        <X size={14} style={{ marginRight: '4px' }} /> Bersihkan
                    </button>
                )}
                <input
                    type="text"
                    className="form-input"
                    placeholder="Nama Terang..."
                    value={namaTerang}
                    onChange={handleNameChange}
                    style={{ textAlign: 'center', fontWeight: 600 }}
                />
            </div>
        </div>
    );
}
