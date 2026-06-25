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
