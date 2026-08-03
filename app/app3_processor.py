import sys
import os
import json
import re
import pandas as pd
import numpy as np
import traceback

def parse_barcodes(barcode_str):
    if pd.isna(barcode_str) or not isinstance(barcode_str, str) or str(barcode_str).strip() == '':
        return ['']
    cleaned_str = str(barcode_str).replace(';', ',').replace('\n', ',').replace('|', ',')
    if cleaned_str.strip().upper() in ['N/A', 'NULL', 'NONE', 'TIDAK ADA', 'KOSONG', '-']:
        return ['']

    tokens = re.split(r'[,\s]+', cleaned_str)
    valid_barcodes = []
    seen = set()
    
    for token in tokens:
        token = token.strip().strip('.')
        if len(token) >= 3 and (any(c.isdigit() for c in token) or (any(c in '-_/' for c in token) and token.isupper() and len(token) >= 4)):
            if token not in seen:
                seen.add(token)
                valid_barcodes.append(token)
                
    return valid_barcodes if valid_barcodes else [cleaned_str.strip()]

def expand_and_clean_barcodes(raw_barcode_text):
    expanded_barcodes = []
    for barcode in parse_barcodes(raw_barcode_text):
        if not barcode: continue
        range_match = re.match(r'^(\d{6,})\s*-\s*(\d{6,})$', barcode)
        if range_match:
            try:
                start, end = int(range_match.group(1)), int(range_match.group(2))
                if start <= end and end - start <= 200000:
                    expanded_barcodes.extend(map(str, range(start, end + 1)))
                    continue
            except ValueError: pass
        expanded_barcodes.append(barcode)
    return list(dict.fromkeys(expanded_barcodes)) or ['']

def dynamic_extract(df, file_type):
    str_df = df.astype(str).apply(lambda x: x.str.strip().str.upper())
    header_idx = -1
    cols_map = {}
    
    for idx, row in str_df.head(20).iterrows():
        row_list = row.tolist()
        bc_col = next((i for i, v in enumerate(row_list) if isinstance(v, str) and 'BARCODE' in v), -1)
        harta_col = next((i for i, v in enumerate(row_list) if isinstance(v, str) and any(k in v for k in ['HARTA', 'ASET', 'ASSET'])), -1)
        
        if bc_col != -1 and harta_col != -1:
            header_idx = idx
            cols_map = {
                'NO BARCODE': bc_col,
                'ASSET ORACLE': next((i for i, v in enumerate(row_list) if isinstance(v, str) and 'ASSET' in v), -1),
                'LOKASI': next((i for i, v in enumerate(row_list) if isinstance(v, str) and v == 'LOKASI'), -1),
                'JENIS HARTA': harta_col,
                'KONDISI': next((i for i, v in enumerate(row_list) if isinstance(v, str) and 'KONDISI' in v), -1),
                'BAT': next((i for i, v in enumerate(row_list) if isinstance(v, str) and 'BAT' in v), -1)
            }
            pero_cols = [i for i, v in enumerate(row_list) if isinstance(v, str) and 'PERO' in v]
            if file_type == 'inv' and not pero_cols and idx + 1 < len(df):
                next_row = str_df.iloc[idx + 1].tolist()
                cols_map['PERO_1'] = next((i for i, v in enumerate(next_row) if isinstance(v, str) and 'BULAN' in v), -1)
                cols_map['PERO_2'] = next((i for i, v in enumerate(next_row) if isinstance(v, str) and 'TAHUN' in v), -1)
            else:
                cols_map['PERO_1'] = pero_cols[0] if len(pero_cols) > 0 else -1
                cols_map['PERO_2'] = pero_cols[1] if len(pero_cols) > 1 else -1
            break
            
    if header_idx == -1: return None
    
    data_df = df.iloc[header_idx + 1:]
    res_data = {k: (data_df.iloc[:, v].copy() if v != -1 else "") for k, v in cols_map.items() if not k.startswith('PERO')}
    res_df = pd.DataFrame(res_data)
    
    if cols_map['PERO_1'] != -1 and cols_map['PERO_2'] != -1:
        res_df['Tahun Perolehan'] = data_df.apply(lambda r: format_custom_date(r.iloc[cols_map['PERO_1']], r.iloc[cols_map['PERO_2']]), axis=1)
    else:
        res_df['Tahun Perolehan'] = ""
        
    return res_df[[c for c in ['NO BARCODE', 'ASSET ORACLE', 'LOKASI', 'JENIS HARTA', 'KONDISI', 'Tahun Perolehan', 'BAT'] if c in res_df.columns]]

def get_bat_filters(files):
    b_filters = set()
    errors = []
    for ftype in ['exa', 'add', 'inv']:
        path = files.get(ftype)
        if path and os.path.exists(path):
            try:
                for df in pd.read_excel(path, header=None, sheet_name=None).values():
                    ext = dynamic_extract(df, ftype)
                    if ext is not None and not ext.empty:
                        b_filters.update(ext['BAT'].dropna().astype(str).str.strip().unique())
            except Exception as e:
                errors.append(f"{ftype.upper()} BAT Error: {e}")
    return {"status": "success", "data": sorted([b for b in b_filters if b and b.upper() not in ('NAN', 'NONE', 'NULL')]), "errors": errors}

def format_custom_date(month, year):
    try:
        if pd.isna(month) and pd.isna(year): return ""
        m = int(float(month)) if not pd.isna(month) else 1
        y = int(float(year)) if not pd.isna(year) else 1
        if y < 100: y = (2000 + y) if y <= 50 else (1900 + y)
        return f"01/{m:02d}/{y}"
    except (ValueError, TypeError):
        return ""

def process_file(file_path, file_type, selected_bats):
    if not file_path or not os.path.exists(file_path): return pd.DataFrame()
    rows = []
    for df in pd.read_excel(file_path, header=None, sheet_name=None).values():
        res_df = dynamic_extract(df, file_type)
        if res_df is None or res_df.empty: continue
        res_df['BAT'] = res_df['BAT'].astype(str).str.strip()
        mask = res_df['BAT'].isin(selected_bats) | res_df['BAT'].str.contains('|'.join(map(re.escape, selected_bats)), case=False, na=False)
        df_filt = res_df[mask].copy()
        for _, row in df_filt.iterrows():
            for bc in expand_and_clean_barcodes(row['NO BARCODE']):
                new_row = row.copy()
                new_row['NO BARCODE'] = bc
                rows.append(new_row)
    return pd.DataFrame(rows)

def run_consolidation(files, selected_bats, output_path):
    try:
        master_path = files.get('master')
        garbage_keywords = ('JUMLAH', 'TOTAL ', 'INVENTARIS YANG ')
        
        master_df = pd.DataFrame()
        if master_path and os.path.exists(master_path):
            master_df = pd.read_excel(master_path).replace(r'^\s*$', np.nan, regex=True).apply(lambda x: x.str.strip() if x.dtype == "object" else x)
        
        src_dfs = []
        for ftype in ['exa', 'add', 'inv']:
            src = process_file(files.get(ftype), ftype, selected_bats)
            if not src.empty:
                src.replace(r'^\s*$', np.nan, regex=True, inplace=True)
                src = src.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
                src = src[~src['JENIS HARTA'].astype(str).str.upper().str.startswith(garbage_keywords)]
                src_dfs.append(src)
                
        if not src_dfs and master_df.empty:
            return {"status": "error", "message": "Tidak ada data yang diproses."}

        if src_dfs:
            combined_src = pd.concat(src_dfs).dropna(subset=['NO BARCODE'])
            combined_src.set_index('NO BARCODE', inplace=True)
            combined_src = combined_src[~combined_src.index.duplicated(keep='first')]
            
            if not master_df.empty and 'NO BARCODE' in master_df.columns:
                master_df.set_index('NO BARCODE', inplace=True)
                master_df = master_df.combine_first(combined_src)
                master_df.reset_index(inplace=True)
            else:
                master_df = combined_src.reset_index()

        df_final = master_df.dropna(subset=['NO BARCODE', 'JENIS HARTA'], how='all').replace(np.nan, '')
        expected_cols = ['NO BARCODE', 'ASSET ORACLE', 'LOKASI', 'JENIS HARTA', 'KONDISI', 'Tahun Perolehan', 'BAT']
        df_final = df_final[[c for c in expected_cols if c in df_final.columns] + [c for c in df_final.columns if c not in expected_cols]]
        
        from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df_final.to_excel(writer, index=False, sheet_name='Master Data')
            ws = writer.sheets['Master Data']
            ws.freeze_panes = 'A2'
            
            thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
            center_align = Alignment(horizontal='center', vertical='center')
            
            for col, w in zip(ws.columns, [20, 20, 35, 40, 25, 20, 15]):
                ws.column_dimensions[col[0].column_letter].width = w
                
            for row in ws.iter_rows(min_row=1, max_row=ws.max_row, min_col=1, max_col=ws.max_column):
                for cell in row:
                    cell.alignment = center_align
                    cell.border = thin_border
                    if cell.row == 1:
                        cell.fill = PatternFill(start_color='548235', end_color='548235', fill_type='solid')
                        cell.font = Font(color='FFFFFF', bold=True)

        return {"status": "success", "message": "Proses berhasil", "output": output_path, "rows": len(df_final)}
    except Exception as e:
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(1)
    try:
        input_arg = sys.argv[2] if len(sys.argv) > 2 else "{}"
        data = json.load(open(input_arg, 'r', encoding='utf-8')) if os.path.exists(input_arg) else json.loads(input_arg)
    except: data = {}

    if sys.argv[1] == "get_bat": print(json.dumps(get_bat_filters(data.get("files", {}))))
    elif sys.argv[1] == "process": print(json.dumps(run_consolidation(data.get("files", {}), data.get("selected_bats", []), data.get("output_path", "Master_Output.xlsx"))))
