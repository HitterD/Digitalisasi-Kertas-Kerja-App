import pandas as pd
import traceback
import os

def clean_string(val):
    if pd.isna(val) or val is None:
        return ""
    if isinstance(val, float):
        if val.is_integer():
            return str(int(val))
        return str(val).rstrip('0').rstrip('.')
    if isinstance(val, int):
        return str(val)
    if isinstance(val, str):
        val = val.strip()
        if val.endswith('.0'):
            val = val[:-2]
        return val
    return str(val).strip()

try:
    master_file = r"d:\Digitalisasi Kertas Kerja APP\app\data\app3_archive\Master_Lama_Archived_1772867712203.xlsx"
    df = pd.read_excel(master_file)
    master_barcodes = set(clean_string(v) for v in df['NO BARCODE'].values)
    
    test_barcodes = ['1300008690', '1300009490', '2511004889']
    print(f"Loaded {len(master_barcodes)} master barcodes.")
    for bc in test_barcodes:
        print(f"{bc} in master? {bc in master_barcodes}")
        
    print("\nSample 5 barcodes from master:")
    print(list(master_barcodes)[:5])
    
except Exception as e:
    traceback.print_exc()
