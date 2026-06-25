# APP1 Opname Flexible Signatures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the opname signature section to support 2-4 flexible columns with editable labels, lockable canvas, and dynamic PDF export.

**Architecture:** We will introduce a new array-based model for `signatures`, create a normalization helper for backward compatibility, update the state reducer to handle array updates, modify the UI components to render dynamically based on the array, and adjust the PDF generator to calculate columns dynamically.

**Tech Stack:** React, jsPDF

## Global Constraints

- MIN_SIGNATURE_COLUMNS = 2
- DEFAULT_SIGNATURE_COLUMNS = 3
- MAX_SIGNATURE_COLUMNS = 4
- Palette must follow existing app styles (Warm Atelier tokens)

---

### Task 1: Data Models & Helpers

**Files:**
- Create: `app/src/utils/signatures.js`

**Interfaces:**
- Consumes: Nothing
- Produces: `MIN_SIGNATURE_COLUMNS`, `MAX_SIGNATURE_COLUMNS`, `normalizeSignatures(signatures)`, `addSignatureColumn(signatures)`, `removeSignatureColumn(signatures)`

- [ ] **Step 1: Write the implementation for `app/src/utils/signatures.js`**

```javascript
export const MIN_SIGNATURE_COLUMNS = 2;
export const DEFAULT_SIGNATURE_COLUMNS = 3;
export const MAX_SIGNATURE_COLUMNS = 4;

export function getDefaultSignatures() {
    return [
        { id: 'petugas-opname-1', roleLabel: 'PETUGAS OPNAME 1', name: '', image: null, locked: false },
        { id: 'petugas-opname-2', roleLabel: 'PETUGAS OPNAME 2', name: '', image: null, locked: false },
        { id: 'pic-ruangan', roleLabel: 'PIC RUANGAN', name: '', image: null, locked: false }
    ];
}

export function normalizeSignatures(signatures) {
    if (Array.isArray(signatures)) {
        if (signatures.length === 0) return getDefaultSignatures();
        return signatures;
    }
    
    if (signatures && typeof signatures === 'object') {
        return [
            { id: 'petugas-opname-1', roleLabel: 'PETUGAS OPNAME 1', name: signatures.petugasOpname1Name || '', image: signatures.petugasOpname1 || null, locked: false },
            { id: 'petugas-opname-2', roleLabel: 'PETUGAS OPNAME 2', name: signatures.petugasOpname2Name || '', image: signatures.petugasOpname2 || null, locked: false },
            { id: 'pic-ruangan', roleLabel: 'PIC RUANGAN', name: signatures.picRuanganName || '', image: signatures.picRuangan || null, locked: false }
        ];
    }
    
    return getDefaultSignatures();
}

export function addSignatureColumn(signatures) {
    const norms = normalizeSignatures(signatures);
    if (norms.length >= MAX_SIGNATURE_COLUMNS) return norms;
    return [...norms, { id: `pic-ruangan-${Date.now()}`, roleLabel: 'PIC RUANGAN 2', name: '', image: null, locked: false }];
}

export function removeSignatureColumn(signatures) {
    const norms = normalizeSignatures(signatures);
    if (norms.length <= MIN_SIGNATURE_COLUMNS) return norms;
    return norms.slice(0, -1);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/utils/signatures.js
git commit -m "feat: add signature data helpers"
```

---

### Task 2: State Reducer Updates

**Files:**
- Modify: `app/src/store/useOpnameState.jsx`

**Interfaces:**
- Consumes: `getDefaultSignatures` from `app/src/utils/signatures.js`
- Produces: State `UPDATE_SIGNATURES` action. Initialize new rooms with `signatures` array instead of object.

- [ ] **Step 1: Write the minimal implementation**

Modify `app/src/store/useOpnameState.jsx`:

1. Import `getDefaultSignatures` at the top:
```javascript
import { getDefaultSignatures } from '../utils/signatures';
```

2. Replace the `SET_SIGNATURE` case (around line 140) with `UPDATE_SIGNATURES`:
```javascript
        case 'UPDATE_SIGNATURES': {
            const { roomIndex, data } = action.payload;
            const rooms = [...state.rooms];
            const room = { ...rooms[roomIndex] };
            room.signatures = data;
            rooms[roomIndex] = room;
            return { ...state, rooms };
        }
```

3. Update `ADD_CUSTOM_ROOM` (around line 211) and `ADD_SQL_IMPORTED_ROOM` (around line 290) to use `getDefaultSignatures()`:
```javascript
                signatures: getDefaultSignatures(),
```

4. Replace `setSignature` in `useOpnameState` return hook with `updateSignatures`:
```javascript
    const updateSignatures = useCallback((roomIndex, data) => dispatch({ type: 'UPDATE_SIGNATURES', payload: { roomIndex, data } }), []);
```

- [ ] **Step 2: Commit**

```bash
git add app/src/store/useOpnameState.jsx
git commit -m "feat: update opname reducer for array signatures"
```

---

### Task 3: SignaturePad UI Refactor

**Files:**
- Modify: `app/src/components/SignaturePad.jsx`

**Interfaces:**
- Consumes: Object `item` with fields `{ roleLabel, name, image, locked }`.
- Produces: `SignaturePad` accepting `item` and `onUpdate(updatedItem)`.

- [ ] **Step 1: Write the minimal implementation**

Modify `app/src/components/SignaturePad.jsx`.
Change the props and add `item` and `onUpdate`.

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/SignaturePad.jsx
git commit -m "feat: upgrade SignaturePad with lock, label, and larger canvas"
```

---

### Task 4: SignatureSection UI & OpnamePage

**Files:**
- Modify: `app/src/components/SignatureSection.jsx`
- Modify: `app/src/pages/OpnamePage.jsx`

**Interfaces:**
- Consumes: `normalizeSignatures`, `addSignatureColumn`, `removeSignatureColumn`, `updateSignatures`.

- [ ] **Step 1: Write the minimal implementation for `SignatureSection.jsx`**

```javascript
import { PenTool, Plus, Minus } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { normalizeSignatures, addSignatureColumn, removeSignatureColumn, MAX_SIGNATURE_COLUMNS, MIN_SIGNATURE_COLUMNS } from '../utils/signatures';

export default function SignatureSection({ room, roomIdx, onUpdateSignatures }) {
    const signatures = normalizeSignatures(room.signatures);
    
    const handleAdd = () => {
        onUpdateSignatures(roomIdx, addSignatureColumn(signatures));
    };
    
    const handleRemove = () => {
        onUpdateSignatures(roomIdx, removeSignatureColumn(signatures));
    };
    
    const handleUpdateItem = (index, updatedItem) => {
        const newSigs = [...signatures];
        newSigs[index] = updatedItem;
        onUpdateSignatures(roomIdx, newSigs);
    };

    return (
        <div className="wa-section">
            <div className="wa-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="wa-icon-wrap">
                        <PenTool size={18} color="var(--terracotta-500)" />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--charcoal-900)' }}>
                        Tanda Tangan &amp; Nama Terang
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--charcoal-500)' }}>
                        {signatures.length}/4 kolom aktif · minimal 2
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                        className="btn btn--outline btn--sm" 
                        onClick={handleRemove} 
                        disabled={signatures.length <= MIN_SIGNATURE_COLUMNS}
                    >
                        <Minus size={14} style={{ marginRight: 4 }} /> Kurangi
                    </button>
                    <button 
                        className="btn btn--primary btn--sm" 
                        onClick={handleAdd} 
                        disabled={signatures.length >= MAX_SIGNATURE_COLUMNS}
                    >
                        <Plus size={14} style={{ marginRight: 4 }} /> Tambah PIC
                    </button>
                </div>
            </div>
            <div
                key={`sigs-${roomIdx}`}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${signatures.length}, minmax(0, 1fr))`,
                    gap: 14,
                    padding: '0 22px 18px',
                }}
                className={`signature-section signature-section--${signatures.length}`}
            >
                {signatures.map((item, idx) => (
                    <div key={item.id || idx} className="wa-card" style={{ padding: 16 }}>
                        <SignaturePad
                            item={item}
                            onUpdate={(updated) => handleUpdateItem(idx, updated)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Update `OpnamePage.jsx`**

In `app/src/pages/OpnamePage.jsx`:
1. Change imports: Add `updateSignatures` to destructuring from `useOpname()` (around line 33). Remove `setSignature`.
```javascript
        addNotAtLocationAsset, updateNotAtLocationAsset, removeNotAtLocationAsset,
        updateSignatures, addCustomRoom, removeRoomLocal, addSqlImportedRoom, crossRoomCheck, importData
```

2. Remove `handleSaveSig` and `handleSaveName` function definitions (around line 172-179).

3. Pass `onUpdateSignatures={updateSignatures}` to `SignatureSection`:
```javascript
            {/* Signature Section */}
            <SignatureSection
                room={room}
                roomIdx={roomIdx}
                onUpdateSignatures={updateSignatures}
            />
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/SignatureSection.jsx app/src/pages/OpnamePage.jsx
git commit -m "feat: make signature columns dynamic in UI"
```

---

### Task 5: PDF Generator Refactor

**Files:**
- Modify: `app/src/utils/pdfGenerator.js`

**Interfaces:**
- Consumes: `normalizeSignatures`
- Produces: PDF document with 2-4 signature columns.

- [ ] **Step 1: Write the minimal implementation**

Modify `app/src/utils/pdfGenerator.js`.

1. Import `normalizeSignatures` at the top:
```javascript
import { normalizeSignatures } from './signatures';
```

2. Replace the signature rendering logic (around line 340-386) inside `generateRoomPDF`:

```javascript
    // ===== SIGNATURE AREA =====
    if (currentY > doc.internal.pageSize.getHeight() - 65) {
        doc.addPage();
        currentY = 15;
    }

    currentY += 5;
    
    // Top border for Signature
    doc.setLineWidth(0.5);
    doc.setDrawColor(24, 24, 27);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text('PENGESAHAN OPNAME ASET', margin, currentY);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${meta.area}, ${meta.date}`, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 12;

    const norms = normalizeSignatures(signatures);
    const colCount = norms.length;
    const sigColWidth = (pageWidth - margin * 2) / colCount;
    
    const sigXs = Array.from({ length: colCount }).map((_, i) => margin + (sigColWidth * i) + (sigColWidth / 2));

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    norms.forEach((sig, i) => {
        doc.text(sig.roleLabel || '', sigXs[i], currentY, { align: 'center' });
    });
    currentY += 3;

    // Signature images
    const sigImgW = colCount === 4 ? 35 : 45;
    const sigImgH = colCount === 4 ? 14 : 18;
    
    norms.forEach((sig, i) => {
        if (sig.image) {
            try {
                doc.addImage(sig.image, 'PNG', sigXs[i] - sigImgW / 2, currentY, sigImgW, sigImgH);
            } catch (e) { /* signature not available */ }
        }
    });
    currentY += sigImgH + 5;

    // Signature lines
    doc.setLineWidth(0.3);
    const lineW = colCount === 4 ? 20 : 25;
    norms.forEach((_, i) => {
        doc.line(sigXs[i] - lineW, currentY, sigXs[i] + lineW, currentY);
    });
    currentY += 5;

    // Nama terang
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    norms.forEach((sig, i) => {
        const name = sig.name || '(.........................................)';
        doc.text(name, sigXs[i], currentY, { align: 'center' });
    });

    return doc;
```

- [ ] **Step 2: Commit**

```bash
git add app/src/utils/pdfGenerator.js
git commit -m "feat: render dynamic signatures in PDF export"
```

## Review & Verify

1. Deploy locally using `npm run dev` in `app/`.
2. Perform manual testing according to spec (adding/removing columns, locking, PDF export).

```bash
npm run test -- Signature
```
