import re

with open(r'd:\Digitalisasi Kertas Kerja APP\Recouncil\Recouncil - Januari\ICT OPNAME PROCESSOR PUBLIC V2.py', encoding='utf-8') as f:
    lines = f.readlines()

def extract_method(name):
    start = -1
    for i, line in enumerate(lines):
        if line.strip().startswith(f"def {name}"):
            start = i
            break
    if start == -1: return ""
    indent = len(lines[start]) - len(lines[start].lstrip())
    method_lines = []
    for line in lines[start:]:
        if line.strip() == '':
            method_lines.append(line)
            continue
        curr_indent = len(line) - len(line.lstrip())
        if curr_indent <= indent and line.strip().startswith('def ') and i > start:
            # check if it's the SAME def to avoid breaking immediately
            if line.strip().startswith(f"def {name}"):
                pass
            else:
                break
        method_lines.append(line)
    return "".join(method_lines)

print(extract_method("parse_barcodes"))
print("-" * 50)
print(extract_method("expand_and_clean_barcodes"))

