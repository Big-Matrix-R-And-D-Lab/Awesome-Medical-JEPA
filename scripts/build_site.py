#!/usr/bin/env python3
"""Generate the GitHub Pages site (site/) from data/papers.csv.

Usage:
    python scripts/build_site.py

Writes site/index.html, site/sitemap.xml, site/robots.txt and the social preview image. The site/ folder is
build output (git-ignored); the Pages workflow builds and deploys it on every push to main.
Only the Python standard library is used.
"""

from __future__ import annotations

import html
import json
import os
import re
import shutil
import sys
import urllib.request
from datetime import datetime, timezone

from build_readme import (
    GITHUB_RE,
    ROOT,
    SEP,
    TEMPLATES,
    load_rows,
    ordered_sections,
    sort_key,
    validate,
)

REPO_URL = "https://github.com/Big-Matrix-R-And-D-Lab/Awesome-Medical-JEPA"
SITE_URL = "https://big-matrix-r-and-d-lab.github.io/Awesome-Medical-JEPA/"
OUT = ROOT / "site"

# Paste the content value of Google Search Console's HTML-tag verification here.
GOOGLE_SITE_VERIFICATION = ""

TITLE = "Awesome Medical JEPA: JEPA Papers & Code for Healthcare AI"


def esc(text: str) -> str:
    return html.escape(text or "", quote=True)


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def person(name: str) -> str:
    """'Last, First' -> 'First Last'."""
    last, _, first = name.partition(",")
    return f"{first.strip()} {last.strip()}".strip()


def short_authors(authors: str) -> str:
    names = [a.strip() for a in authors.split(";") if a.strip()]
    lasts = [n.split(",")[0].strip() for n in names]
    return ", ".join(lasts) if len(lasts) <= 3 else f"{', '.join(lasts[:3])} et al."


def has_code(r: dict) -> bool:
    return r.get("official_code") == "Yes" and bool(r.get("code_link"))


def venue_name(r: dict) -> str:
    """Venue without the year (the year is shown separately)."""
    venue = r.get("venue_short") or r.get("venue") or ""
    return re.sub(r"\s*\b(19|20)\d\d\b", "", venue).strip() or venue


def venue_label(r: dict) -> str:
    venue = r.get("venue_short") or r.get("venue") or ""
    year = r.get("year", "")
    return f"{venue} {year}" if year and year not in venue else venue


def fetch_stars(code_links: list[str]) -> dict[str, int]:
    """Star counts for GitHub code links. Best effort: network failures just omit the count."""
    token = os.environ.get("GITHUB_TOKEN", "")
    stars: dict[str, int] = {}
    for link in code_links:
        m = GITHUB_RE.match(link)
        if not m:
            continue
        owner, repo = m.group(1), m.group(2).removesuffix(".git")
        req = urllib.request.Request(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers={"Accept": "application/vnd.github+json", "User-Agent": "awesome-medical-jepa-site",
                     **({"Authorization": f"Bearer {token}"} if token else {})},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                stars[link] = int(json.load(resp)["stargazers_count"])
        except Exception as exc:  # noqa: BLE001 - a missing count must never break the build
            print(f"note: no star count for {owner}/{repo} ({exc})", file=sys.stderr)
    return stars


def compact(n: int) -> str:
    return f"{n / 1000:.1f}k".replace(".0k", "k") if n >= 1000 else str(n)


# ------------------------------------------------------------------------- render
def paper_row(r: dict, stars: dict[str, int], heading: str) -> str:
    links = [f'<a href="{esc(r["paper_link"])}">Paper</a>']
    if has_code(r):
        count = stars.get(r["code_link"])
        star = f' <span class="stars">★ {compact(count)}</span>' if count is not None else ""
        links.append(f'<a href="{esc(r["code_link"])}">Code{star}</a>')
    if r.get("doi"):
        links.append(f'<a href="https://doi.org/{esc(r["doi"])}">DOI</a>')
    if r.get("project_link") and r["project_link"] not in (r.get("code_link"), r["paper_link"]):
        links.append(f'<a href="{esc(r["project_link"])}">Project</a>')
    if not has_code(r):
        links.append('<span class="none">No official code</span>')

    model = esc(r["model_name"])
    if r.get("inclusion_type") == "JEPA-inspired Medical":
        model += ' <span class="tag-inspired">JEPA-inspired</span>'
    text = " ".join(
        r.get(k, "") for k in ("model_name", "paper_name", "authors", "venue", "venue_short", "year",
                                "modality", "task", "jepa_variant", "medical_domain", "section")
    ).lower()
    parts = [
        f'<article class="paper" data-code="{1 if has_code(r) else 0}" data-text="{esc(text)}">',
        f'<div class="when"><span class="yr">{esc(r["year"])}</span><span>{esc(venue_name(r))}</span></div>',
        '<div class="body">',
        f'<p class="model">{model}</p>',
        f'<{heading} class="title"><a href="{esc(r["paper_link"])}">{esc(r["paper_name"])}</a></{heading}>',
    ]
    if r.get("authors"):
        parts.append(f'<p class="authors">{esc(short_authors(r["authors"]))}</p>')
    if r.get("task"):
        parts.append(f'<p class="task">{esc(r["task"])}</p>')
    parts.append("</div>")
    parts.append('<div class="aside">')
    if r.get("modality"):
        parts.append(f'<span class="modality">{esc(r["modality"])}</span>')
    parts.append(f'<div class="links">{"".join(links)}</div>')
    parts.append("</div>")
    parts.append("</article>")
    return "\n".join(parts)


def render_sections(rows: list[dict], stars: dict[str, int]) -> tuple[str, str, int]:
    """Return (sections html, contents nav html, number of areas)."""
    by_section: dict[str, list[dict]] = {}
    for r in rows:
        by_section.setdefault(r["section"], []).append(r)

    def count(s: str) -> int:
        return sum(len(v) for k, v in by_section.items() if k == s or k.startswith(s + SEP))

    out: list[str] = []
    toc: list[str] = []
    areas = 0
    open_area = None
    for s in ordered_sections(rows):
        parts = s.split(SEP)
        area = parts[0]
        if area != open_area:
            if open_area is not None:
                out.append("</section>")
            areas += 1
            out.append(f'<section class="area" id="{slug(area)}">')
            out.append(f'<h2>{esc(area)} <span class="n">{count(area)}</span></h2>')
            toc.append(f'<li><a href="#{slug(area)}"><span>{esc(area)}</span><span class="n">{count(area)}</span></a></li>')
            open_area = area
        if s not in by_section:
            continue
        out.append('<div class="group">')
        heading = "h3"
        if len(parts) > 1:
            out.append(f'<h3 id="{slug(s)}">{esc(parts[-1])}</h3>')
            toc.append(f'<li class="sub"><a href="#{slug(s)}"><span>{esc(parts[-1])}</span><span class="n">{count(s)}</span></a></li>')
            heading = "h4"
        out.extend(paper_row(r, stars, heading) for r in sorted(by_section[s], key=sort_key))
        out.append("</div>")
    if open_area is not None:
        out.append("</section>")
    return "\n".join(out), "\n".join(toc), areas


# A 6x6 patch grid for Fig. 1: c = visible context, t = masked target, . = unused patch.
FIGURE_MASK = [
    "cccc..",
    "ctt.cc",
    "ctt.cc",
    "cc.cct",
    ".cccct",
    "cc.c..",
]


def figure_grid() -> str:
    """SVG rects for the Fig. 1 input grid (20px patches on a 24px pitch at x=10, y=34)."""
    cls = {"c": "ctx", "t": "tgt", ".": "patch"}
    return "\n".join(
        f'          <rect class="{cls[ch]}" x="{10 + x * 24}" y="{34 + y * 24}" width="20" height="20" rx="2"/>'
        for y, row in enumerate(FIGURE_MASK)
        for x, ch in enumerate(row)
    )


def json_ld(rows: list[dict], description: str) -> str:
    items = []
    for i, r in enumerate(sorted(rows, key=sort_key), start=1):
        article = {
            "@type": "ScholarlyArticle",
            "name": r["paper_name"],
            "headline": r["paper_name"][:110],
            "url": r["paper_link"],
            "datePublished": r["year"],
            "author": [{"@type": "Person", "name": person(a)} for a in r.get("authors", "").split(";") if a.strip()],
            "keywords": [k for k in ("JEPA", r.get("jepa_variant"), r.get("modality"), r.get("medical_domain")) if k],
        }
        if r.get("venue"):
            article["publisher"] = {"@type": "Organization", "name": r["venue"]}
        if r.get("doi"):
            article["sameAs"] = f"https://doi.org/{r['doi']}"
        items.append({"@type": "ListItem", "position": i, "item": article})
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebSite", "@id": SITE_URL + "#website", "name": "Awesome Medical JEPA", "url": SITE_URL,
             "sameAs": [REPO_URL]},
            {
                "@type": "CollectionPage",
                "name": TITLE,
                "url": SITE_URL,
                "description": description,
                "isPartOf": {"@id": SITE_URL + "#website"},
                "about": [
                    {"@type": "Thing", "name": "Joint-Embedding Predictive Architecture"},
                    {"@type": "Thing", "name": "Self-supervised learning"},
                    {"@type": "Thing", "name": "Medical imaging"},
                ],
                "license": "https://creativecommons.org/publicdomain/zero/1.0/",
                "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items},
            },
        ],
    }
    # "</" must not appear inside a <script> block.
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def render(rows: list[dict]) -> str:
    stars = fetch_stars([r["code_link"] for r in rows if has_code(r)])
    sections, toc, area_count = render_sections(rows, stars)
    years = sorted({r["year"] for r in rows})
    with_code = sum(1 for r in rows if has_code(r))
    description = (
        f"{len(rows)} curated medical JEPA papers: I-JEPA, V-JEPA and LeJEPA for MRI, CT, "
        "ultrasound, ECG, EEG, surgical video and EHR, with official code."
    )
    verify = (
        f'<meta name="google-site-verification" content="{esc(GOOGLE_SITE_VERIFICATION)}">'
        if GOOGLE_SITE_VERIFICATION else ""
    )
    page = (TEMPLATES / "site.html").read_text(encoding="utf-8")
    for key, value in {
        "{{TITLE}}": esc(TITLE),
        "{{DESCRIPTION}}": esc(description),
        "{{CANONICAL}}": SITE_URL,
        "{{VERIFY}}": verify,
        "{{JSONLD}}": json_ld(rows, description),
        "{{TOTAL}}": str(len(rows)),
        "{{WITH_CODE}}": str(with_code),
        "{{AREA_COUNT}}": str(area_count),
        "{{YEAR_SPAN}}": f"{years[0]}–{years[-1]}" if len(years) > 1 else years[0],
        "{{TOC}}": toc,
        "{{FIGURE_GRID}}": figure_grid(),
        "{{SECTIONS}}": sections,
        "{{REPO}}": REPO_URL,
        "{{UPDATED}}": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }.items():
        page = page.replace(key, value)
    return page


# --------------------------------------------------------------------------- main
def main() -> int:
    rows = load_rows()
    errors = validate(rows)
    if errors:
        print("Found problems in data/papers.csv:", *errors, sep="\n  - ", file=sys.stderr)
        return 1

    OUT.mkdir(exist_ok=True)
    (OUT / "index.html").write_text(render(rows), encoding="utf-8", newline="\n")
    shutil.copyfile(ROOT / "assets" / "social-preview.png", OUT / "social-preview.png")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{SITE_URL}</loc><lastmod>{today}</lastmod></url>\n"
        "</urlset>\n",
        encoding="utf-8", newline="\n",
    )
    (OUT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}sitemap.xml\n", encoding="utf-8", newline="\n"
    )
    print(f"Wrote site/ with {len(rows)} papers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
