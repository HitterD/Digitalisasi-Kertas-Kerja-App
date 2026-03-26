import pandas as pd
import json
import os

files = [
    r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\Recouncil\New folder\Kamus Data Master new.xlsx',
    r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\Recouncil\New folder\Kamus Data Master new 2.xlsx',
    r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\Recouncil\New folder\01 EXA UNDER 2025 BAT.xlsx',
    r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\Recouncil\New folder\01. ADD ASET JANUARI 26 BAT.xlsx',
    r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\Recouncil\New folder\01. INV 2026 BAT.xlsx'
]

results = {}

for f in files:
    try:
        df = pd.read_excel(f, nrows=5)
        name = os.path.basename(f)
        cols = list(df.columns)
        first_row = df.iloc[0].to_dict() if len(df) > 0 else {}
        # handle missing values for json serialization
        for k, v in first_row.items():
            if pd.isna(v):
                first_row[k] = None
            else:
                first_row[k] = str(v)
        
        results[name] = {
            'columns': cols,
            'first_row': first_row
        }
    except Exception as e:
        results[os.path.basename(f)] = {'error': str(e)}

with open('excel_analysis.json', 'w') as f:
    json.dump(results, f, indent=2)
