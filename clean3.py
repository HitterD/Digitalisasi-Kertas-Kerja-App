import os
import re

def clean_file(path):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Borders and rgba
    c = re.sub(r'rgba\(26,26,26,0\.\d+\)', 'var(--border)', c)
    c = c.replace('var(--cream-input)', 'var(--bg-input)')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'Cleaned rgba borders in {path}')

clean_file(r'f:\Program Bagas\SynologyDrive\Digitalisasi Kertas Kerja APP\app\src\pages\ExtractOpnamePage.jsx')
clean_file(r'f:\Program Bagas\SynologyDrive\Digitalisasi Kertas Kerja APP\app\src\components\PreviewModal.jsx')
clean_file(r'f:\Program Bagas\SynologyDrive\Digitalisasi Kertas Kerja APP\app\src\components\SearchableGroupedSelect.jsx')
clean_file(r'f:\Program Bagas\SynologyDrive\Digitalisasi Kertas Kerja APP\app\src\components\BarcodeSearchModal.jsx')
