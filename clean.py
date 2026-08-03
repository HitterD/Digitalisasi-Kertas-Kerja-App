import os

path = r'f:\Program Bagas\SynologyDrive\Digitalisasi Kertas Kerja APP\app\src\pages\ExtractOpnamePage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fake Data
c = c.replace('{synced ? totalRooms : 12}', '{totalRooms}')
c = c.replace('{synced ? filteredTotalScanned : 97}', '{filteredTotalScanned}')
c = c.replace('{synced ? filteredTotalNotScanned : 31}', '{filteredTotalNotScanned}')
c = c.replace('{synced ? salahRuanganCount : 20}', '{salahRuanganCount}')
c = c.replace(" : '79.1%'", " : '0%'")
c = c.replace(" : '20.9%'", " : '0%'")

# Colors
c = c.replace('var(--charcoal-900)', 'var(--text-primary)')
c = c.replace('var(--charcoal-500)', 'var(--text-secondary)')
c = c.replace('var(--charcoal-400)', 'var(--text-muted)')
c = c.replace('rgba(253,251,247,0.95)', 'var(--bg-primary)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('ExtractOpnamePage.jsx updated successfully')
