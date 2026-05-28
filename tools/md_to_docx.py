"""Convert MkDocs Material markdown → clean .docx via pandoc.

Multi-pass approach: each pass does one transformation on the full text.
"""

import re
import sys
import subprocess
from pathlib import Path

PANDOC = Path(
    r"C:\Users\86189\AppData\Local\Microsoft\WinGet\Packages"
    r"\JohnMacFarlane.Pandoc_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\pandoc-3.9.0.2\pandoc.exe"
)


def clean(text: str) -> str:
    # ── Pass 1: Strip HTML div tags ──
    text = re.sub(r'^<div\s+class="[^"]*"\s+markdown\s*>\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^</div>\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^---\nhide:.*?\n---\n?', '', text, count=1, flags=re.DOTALL)

    # ── Pass 2: Mermaid blocks → placeholder ──
    text = re.sub(
        r'```mermaid\n.*?```',
        '\n> **图表：** 请参考 Web 版用户手册查看交互式 Mermaid 图表。\n',
        text,
        flags=re.DOTALL,
    )

    # ── Pass 3: Content tabs ──
    # Split text into chunks by === lines. Each tab group is a sequence of
    # `=== "Name"\n<content>` blocks separated by blank lines.
    def flatten_tabs(text: str) -> str:
        lines = text.split('\n')
        result = []
        i = 0
        while i < len(lines):
            line = lines[i]
            m = re.match(r'^=== "(.+)"\s*$', line)
            if m:
                tab_name = m.group(1)
                result.append(f'**{tab_name}：**')
                result.append('')
                i += 1
                while i < len(lines):
                    sub = lines[i]
                    # Stop conditions
                    if re.match(r'^=== "', sub):
                        break
                    if re.match(r'^(#{1,6}\s|\|)', sub):  # heading or table start
                        break
                    if re.match(r'^!!!\s', sub):
                        break
                    if sub.startswith('```'):
                        break
                    if sub.startswith('---') and len(sub.strip()) <= 4:
                        break
                    # Un-indent content
                    if sub.startswith('    '):
                        result.append(sub[4:])
                    else:
                        result.append(sub)
                    i += 1
                result.append('')
            else:
                result.append(line)
                i += 1
        return '\n'.join(result)

    text = flatten_tabs(text)

    # ── Pass 4: Admonitions → blockquotes ──
    def fix_admonitions(text: str) -> str:
        lines = text.split('\n')
        result = []
        i = 0
        while i < len(lines):
            line = lines[i]
            m = re.match(r'^!!!\s+(\w+)(?:\s+"([^"]*)")?\s*$', line)
            if m:
                adm_type = m.group(1)
                adm_title = m.group(2)
                type_labels = {
                    "note": "说明", "warning": "警告", "tip": "提示",
                    "info": "信息", "example": "示例", "danger": "危险",
                    "question": "问题",
                }
                label = adm_title or type_labels.get(adm_type, adm_type.capitalize())
                result.append(f'> **{label}：**')
                result.append('> ')
                i += 1
                # Collect admonition body
                while i < len(lines):
                    sub = lines[i]
                    # Stop if we hit a structural element
                    if re.match(r'^!!!\s', sub):
                        break
                    if re.match(r'^#{1,6}\s', sub):  # heading
                        break
                    if re.match(r'^=== "', sub):
                        break
                    if sub.startswith('```'):
                        break
                    if sub.strip() == '---':
                        break
                    if sub.strip() == '':
                        # Blank line inside admonition
                        peek = lines[i + 1] if i + 1 < len(lines) else ''
                        if peek.strip() and not re.match(r'^(#{1,6}\s|!!!\s|=== "|```)', peek):
                            result.append('> ')
                        i += 1
                        continue
                    # Un-indent if needed
                    content = sub[4:] if sub.startswith('    ') else sub
                    result.append(f'> {content}')
                    i += 1
                result.append('')
            else:
                result.append(line)
                i += 1
        return '\n'.join(result)

    text = fix_admonitions(text)

    # ── Pass 5: Material icons ──
    # Specific icon replacements (before generic strip)
    text = re.sub(r':material-check:', '✓', text)
    text = re.sub(r':material-close:', '✗', text)
    text = re.sub(r':material-[a-z\-]+:', '', text)

    # ── Pass 5b: Fix empty table cells left by icon removal ──
    # Replace | | patterns in tables (two spaces between pipes = empty cell)
    # that should have been icons, with a dash
    text = re.sub(r'\|\s{2,3}\|', '| — |', text)

    # ── Pass 6: Inline style attributes ──
    text = re.sub(r'\{\s*style="[^"]*"\s*\}', '', text)

    # ── Pass 7: Keyboard shortcuts ──
    text = re.sub(r'\+\+(\w+(?:\+\w+)?)\+\+', r'**\1**', text)

    # ── Pass 8: Task lists ──
    text = re.sub(r'^(\s*)- \[ \] ', r'\1- ☐ ', text, flags=re.MULTILINE)
    text = re.sub(r'^(\s*)- \[[xX]\] ', r'\1- ☑ ', text, flags=re.MULTILINE)

    # ── Pass 9: Collapsible FAQ blocks ??? → bold heading ──
    def fix_collapsible(text: str) -> str:
        lines = text.split('\n')
        result = []
        i = 0
        while i < len(lines):
            m = re.match(r'^\?\?\?+\s+(?:question|info|note|warning|tip|example)\s+"(.+)"\s*$', lines[i])
            if m:
                result.append(f'**Q: {m.group(1)}**')
                result.append('')
                i += 1
                while i < len(lines):
                    sub = lines[i]
                    if re.match(r'^\?\?\?', sub):
                        break
                    if re.match(r'^#{1,6}\s', sub):
                        break
                    if sub.startswith('    '):
                        result.append(sub[4:])
                    else:
                        result.append(sub)
                    i += 1
                result.append('')
            else:
                result.append(lines[i])
                i += 1
        return '\n'.join(result)

    text = fix_collapsible(text)

    # ── Pass 10: HTML comments ──
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)

    # ── Final: collapse excessive blank lines ──
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    return text


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("docs/user-manual.md")
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("docs/user-manual.docx")

    raw = src.read_text(encoding="utf-8")
    cleaned = clean(raw)

    # Write intermediate for debugging
    tmp = src.parent / (src.stem + "-word.md")
    tmp.write_text(cleaned, encoding="utf-8")

    pandoc = str(PANDOC) if PANDOC.exists() else "pandoc"
    subprocess.run(
        [pandoc, str(tmp), "-f", "markdown", "-t", "docx", "-o", str(out)],
        check=True,
    )
    print(f"Cleaned markdown: {tmp}")
    print(f"Word document:   {out}")


if __name__ == "__main__":
    main()
