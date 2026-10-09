#!/usr/bin/env python3
"""Generate README.md from data/papers.csv.

Usage:
    python scripts/build_readme.py           # validate the CSV and rewrite README.md
    python scripts/build_readme.py --check   # validate and fail if README.md is out of date

Only the Python standard library is used, so no installation is needed.
"""

from __future__ import annotations

import argparse
import csv
import html
import re
import sys
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "papers.csv"
README_PATH = ROOT / "README.md"
TEMPLATES = Path(__file__).resolve().parent / "templates"

SEP = " > "  # separates a section from its subsection in the `section` column

# Display order. Sections found in the CSV but missing here are appended at the end.
SECTION_ORDER = [
    "Foundations",
    "Foundations > Architectures",
    "Foundations > Theory & Objectives",
    "Medical Imaging",
    "Medical Imaging > Radiology",
    "Medical Imaging > Neuroimaging",
    "Medical Imaging > Cardiac Imaging",
    "Medical Imaging > Ultrasound",
    "Medical Imaging > Computational Pathology",
    "Surgical Video",
    "Physiological Signals",
    "Physiological Signals > ECG",
    "Physiological Signals > EEG",
    "Physiological Signals > Multimodal & ICU Monitoring",
    "EHR & Clinical Trajectories",
    "Molecular & Single-Cell Biology",
]

# Icon shown before each top-level area heading. Areas without one get a plain heading.
AREA_ICONS = {
    "Foundations": "🧱",
    "Medical Imaging": "🩻",
    "Surgical Video": "🎥",
    "Physiological Signals": "💓",
    "EHR & Clinical Trajectories": "📋",
    "Molecular & Single-Cell Biology": "🧬",
}

REQUIRED = ["paper_name", "paper_link", "year", "section", "model_name", "inclusion_type"]
INCLUSION_TYPES = {"Direct Medical JEPA", "JEPA-inspired Medical", "Foundational JEPA"}
INSPIRED_MARK = " 🔸"
GITHUB_RE = re.compile(r"^https?://github\.com/([^/\s]+)/([^/\s#?]+)")


# --------------------------------------------------------------------------- data
def load_rows() -> list[dict]:
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def validate(rows: list[dict]) -> list[str]:
    errors: list[str] = []
    seen_titles: dict[str, int] = {}
    for n, r in enumerate(rows, start=2):  # line 1 is the header
        where = f"data/papers.csv line {n}"
        for col in REQUIRED:
            if not r.get(col):
                errors.append(f"{where}: missing required field '{col}'")
        if r.get("year") and not re.fullmatch(r"(19|20)\d\d", r["year"]):
            errors.append(f"{where}: year '{r['year']}' is not a 4-digit year")
        if r.get("inclusion_type") and r["inclusion_type"] not in INCLUSION_TYPES:
            errors.append(f"{where}: inclusion_type must be one of {sorted(INCLUSION_TYPES)}")
        for col in ("paper_link", "code_link", "project_link", "dataset_link"):
            if r.get(col) and not r[col].startswith(("http://", "https://")):
                errors.append(f"{where}: {col} must be a full http(s) URL")
        if r.get("official_code") not in ("", "Yes", "No"):
            errors.append(f"{where}: official_code must be 'Yes', 'No' or empty")
        if r.get("official_code") == "Yes" and not r.get("code_link"):
            errors.append(f"{where}: official_code is 'Yes' but code_link is empty")
        key = re.sub(r"\W+", " ", r.get("paper_name", "").lower()).strip()
        if key in seen_titles:
            errors.append(f"{where}: duplicate of the paper on line {seen_titles[key]}")
        elif key:
            seen_titles[key] = n
    return errors


# ------------------------------------------------------------------------ helpers
def cell(text: str) -> str:
    """Make text safe inside a markdown table cell."""
    return text.replace("|", "\\|").replace("\n", " ")


def slugify(heading: str, used: Counter) -> str:
    """Reproduce GitHub's heading-anchor algorithm."""
    slug = re.sub(r"[^\w\- ]", "", heading.lower()).replace(" ", "-")
    n = used[slug]
    used[slug] += 1
    return slug if n == 0 else f"{slug}-{n}"


def code_cell(r: dict) -> str:
    link = r.get("code_link", "")
    if r.get("official_code") != "Yes" or not link:
        return "—"
    m = GITHUB_RE.match(link)
    if m:
        owner, repo = m.group(1), m.group(2).removesuffix(".git")
        badge = f"https://img.shields.io/github/stars/{owner}/{repo}?style=flat-square&logo=github&label=&color=24292f"
        return f"[![GitHub stars]({badge})]({link})"
    return f"[Code]({link})"


def venue_cell(r: dict) -> str:
    venue = r.get("venue_short") or r.get("venue") or "—"
    year = r.get("year", "")
    if year and year not in venue:
        return f"{cell(venue)}<br><sub>{year}</sub>"
    return cell(venue)


def model_cell(r: dict) -> str:
    name = cell(r["model_name"])
    if len(name) <= 18:  # keep short names on one line (non-breaking space and hyphen)
        name = name.replace(" ", "&nbsp;").replace("-", "‑")
    model = f"**{name}**"
    if r.get("inclusion_type") == "JEPA-inspired Medical":
        model += INSPIRED_MARK
    return model


def paper_row(r: dict) -> str:
    paper = f"[{cell(r['paper_name'])}]({r['paper_link']})"
    details = []
    if r.get("modality"):
        details.append(f"<code>{html.escape(cell(r['modality']))}</code>")
    if r.get("task"):
        details.append(cell(r["task"]))
    if details:
        paper += f"<br><sub>{' '.join(details)}</sub>"
    return f"| {model_cell(r)} | {paper} | {venue_cell(r)} | {code_cell(r)} |"


TABLE_HEAD = "| Model | Paper | Venue | Code |\n| :-- | :-- | :-: | :-: |"
BACK_TO_TOP = '<p align="right"><a href="#contents"><sub>↑ back to top</sub></a></p>'
BAR_WIDTH = 24  # characters for the largest bar in the year chart


def sort_key(r: dict):
    return (-int(r["year"]), r["model_name"].lower())


# ------------------------------------------------------------------------- render
def ordered_sections(rows: list[dict]) -> list[str]:
    present = {r["section"] for r in rows}
    unknown = sorted(present - set(SECTION_ORDER))
    for s in unknown:
        print(f"note: section '{s}' is not in SECTION_ORDER; appending it at the end", file=sys.stderr)
    return [s for s in SECTION_ORDER if s in present or any(p.startswith(s + SEP) for p in present)] + unknown


def render_years(rows: list[dict]) -> str:
    years = sorted(Counter(r["year"] for r in rows).items())
    peak = max(n for _, n in years)
    lines = ["| Year | Papers | |", "| :-- | --: | :-- |"]
    for year, n in years:
        bar = "█" * max(1, round(n / peak * BAR_WIDTH))
        lines.append(f"| {year} | {n} | {bar} |")
    return "\n".join(lines)


def heading_title(section: str) -> str:
    """Heading text for a section; top-level areas get their icon."""
    parts = section.split(SEP)
    icon = AREA_ICONS.get(parts[0]) if len(parts) == 1 else None
    return f"{icon} {parts[-1]}" if icon else parts[-1]


def template_headings(text: str) -> list[str]:
    """Markdown headings in a template, skipping fenced code blocks."""
    out, fenced = [], False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            fenced = not fenced
        elif not fenced and (m := re.match(r"#{1,6} (.+)", line)):
            out.append(m.group(1).strip())
    return out


def render(rows: list[dict]) -> str:
    header = (TEMPLATES / "header.md").read_text(encoding="utf-8")
    footer = (TEMPLATES / "footer.md").read_text(encoding="utf-8")

    used: Counter = Counter()
    # Reserve anchors for headings that appear in the header before the sections.
    for h in template_headings(header):
        slugify(h, used)

    by_section: dict[str, list[dict]] = {}
    for r in rows:
        by_section.setdefault(r["section"], []).append(r)

    def count(s: str) -> int:
        return sum(len(v) for k, v in by_section.items() if k == s or k.startswith(s + SEP))

    areas: OrderedDict[str, list] = OrderedDict()  # area -> [link, icon, count, subsection links]
    body = []
    for s in ordered_sections(rows):
        parts = s.split(SEP)
        title = heading_title(s)
        anchor = slugify(title, used)
        link = f"[{parts[-1]}](#{anchor})"
        if len(parts) == 1:
            areas[s] = [f"**{link}**", AREA_ICONS.get(s, ""), count(s), []]
        else:
            areas.setdefault(parts[0], [parts[0], "", 0, []])[3].append(f"{link}&nbsp;<sub>{count(s)}</sub>")
        body.append(f"{'#' * (len(parts) + 1)} {title}\n")
        if s in by_section:
            body.append(TABLE_HEAD)
            body.extend(paper_row(r) for r in sorted(by_section[s], key=sort_key))
            body.append(f"\n{BACK_TO_TOP}\n")

    toc = ["| | Area | Papers | Sections |", "| :-: | :-- | :-: | :-- |"]
    for link, icon, n, subs in areas.values():
        toc.append(f"| {icon} | {link} | {n} | {' · '.join(subs) or '—'} |")

    with_code = sum(1 for r in rows if r.get("official_code") == "Yes" and r.get("code_link"))
    header = (
        header.replace("{{TOTAL}}", str(len(rows)))
        .replace("{{WITH_CODE}}", str(with_code))
        .replace("{{AREA_COUNT}}", str(len(areas)))
        .replace("{{YEARS}}", render_years(rows))
        .replace("{{TOC}}", "\n".join(toc))
    )
    note = "<!-- This file is generated by scripts/build_readme.py from data/papers.csv. Do not edit it by hand. -->\n\n"
    return note + header.rstrip() + "\n\n" + "\n".join(body).rstrip() + "\n\n" + footer.rstrip() + "\n"


# --------------------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="fail if README.md is not up to date")
    args = ap.parse_args()

    rows = load_rows()
    errors = validate(rows)
    if errors:
        print("Found problems in data/papers.csv:", *errors, sep="\n  - ", file=sys.stderr)
        return 1

    readme = render(rows)
    if args.check:
        current = README_PATH.read_text(encoding="utf-8") if README_PATH.exists() else ""
        if current != readme:
            print("README.md is out of date. Run: python scripts/build_readme.py", file=sys.stderr)
            return 1
        print(f"README.md is up to date ({len(rows)} papers).")
        return 0

    README_PATH.write_text(readme, encoding="utf-8")
    print(f"Wrote README.md with {len(rows)} papers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
