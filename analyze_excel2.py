import pandas as pd
import os

files = [
    r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\Recouncil\New folder\01 EXA UNDER 2025 BAT.xlsx',
    r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\Recouncil\New folder\01. ADD ASET JANUARI 26 BAT.xlsx',
    r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\Recouncil\New folder\01. INV 2026 BAT.xlsx'
]

for f in files:
    print(f"\n--- {os.path.basename(f)} ---")
    df = pd.read_excel(f, nrows=20, header=None)
    for i, row in df.iterrows():
        # Check how many non-null values, usually header has >5
        non_nulls = row.dropna().count()
        if non_nulls > 3:
            print(f"Probable header at row {i} ({non_nulls} non-nulls):")
            # print first 30 columns to check col M (12) and W (22)
            for col_idx in range(min(30, len(row))):
                val = row.iloc[col_idx]
                if pd.notna(val):
                    print(f"Col {col_idx} ({chr(65+col_idx)} if < 26): {val}")
            break
