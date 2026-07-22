"""
Convert all Markdown files under docs/ to Word .docx in docs-docx/
Preserves folder structure. Does not modify docs/.
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS_SRC = ROOT / "docs"
DOCS_DST = ROOT / "docs-docx"

PANDOC_CANDIDATES = [
    Path(os.environ.get("LOCALAPPDATA", "")) / "Pandoc" / "pandoc.exe",
    Path(r"C:\Program Files\Pandoc\pandoc.exe"),
    Path(r"C:\Program Files (x86)\Pandoc\pandoc.exe"),
]


def find_pandoc() -> str:
    for candidate in PANDOC_CANDIDATES:
        if candidate.exists():
            return str(candidate)
    from shutil import which

    found = which("pandoc")
    if found:
        return found
    raise RuntimeError("pandoc not found. Install from https://pandoc.org/")


def convert_file(pandoc: str, src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        pandoc,
        str(src),
        "-f",
        "markdown",
        "-t",
        "docx",
        "-o",
        str(dst),
        "--standalone",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed: {src}\nstdout: {result.stdout}\nstderr: {result.stderr}"
        )


def main() -> int:
    if not DOCS_SRC.is_dir():
        print(f"Source folder not found: {DOCS_SRC}", file=sys.stderr)
        return 1

    pandoc = find_pandoc()
    md_files = sorted(DOCS_SRC.rglob("*.md"))
    if not md_files:
        print("No .md files found in docs/", file=sys.stderr)
        return 1

    DOCS_DST.mkdir(parents=True, exist_ok=True)
    ok = 0
    failed: list[str] = []

    for src in md_files:
        rel = src.relative_to(DOCS_SRC)
        dst = DOCS_DST / rel.with_suffix(".docx")
        try:
            convert_file(pandoc, src, dst)
            ok += 1
            print(f"OK  {rel}")
        except Exception as e:
            failed.append(f"{rel}: {e}")
            print(f"ERR {rel}: {e}", file=sys.stderr)

    print(f"\nDone: {ok}/{len(md_files)} converted -> {DOCS_DST}")
    if failed:
        print(f"Failed: {len(failed)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
