import os

def clean_file(path):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Colors
    c = c.replace('var(--charcoal-900)', 'var(--text-primary)')
    c = c.replace('var(--charcoal-500)', 'var(--text-secondary)')
    c = c.replace('var(--charcoal-400)', 'var(--text-muted)')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'Cleaned {path}')

clean_file(r'f:\Program Bagas\SynologyDrive\Digitalisasi Kertas Kerja APP\app\src\components\PreviewModal.jsx')
clean_file(r'f:\Program Bagas\SynologyDrive\Digitalisasi Kertas Kerja APP\app\src\components\SearchableGroupedSelect.jsx')
clean_file(r'f:\Program Bagas\SynologyDrive\Digitalisasi Kertas Kerja APP\app\src\components\BarcodeSearchModal.jsx')

