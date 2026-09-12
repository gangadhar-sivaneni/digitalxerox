from pathlib import Path

files = [
    Path('desginplan.html'),
    Path('Digital_Xerox_Stationery_Ordering_System_Full_Implementation_Plan.md'),
    Path('FULL_STACK_AUDIT.md'),
    Path('LOCAL_SETUP.md'),
    Path('LOCAL_TESTING.md'),
]

replacements = [
    ('Â·', '·'),
    ('â€”', '—'),
    ('â€“', '–'),
    ('â†’', '→'),
    ('Ã—', '×'),
    ('â€¦', '…'),
    ('â€¢', '•'),
    ('â€™', '’'),
    ('â€œ', '“'),
    ('â€', '”'),
    ('âœ…', '✓'),
    ('â‚¹', '₹'),
    ('â—‹', '•'),
    ('â—', '•'),
    ('â”œ', '├'),
    ('â”€', '─'),
    ('â”‚', '│'),
    ('â””', '└'),
    ('âˆ’', '−'),
    ('Â', ''),
    ('Ã', ''),
]

for path in files:
    text = path.read_text(encoding='utf-8', errors='ignore')
    original = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'updated {path}')
