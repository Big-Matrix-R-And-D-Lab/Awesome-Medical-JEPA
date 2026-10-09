#!/usr/bin/env python3
"""Generate the GitHub Pages site (site/) from data/papers.csv.

Usage:
    python scripts/build_site.py

Writes site/index.html, site/sitemap.xml and site/robots.txt. The site/ folder is
build output (git-ignored); the Pages workflow builds and deploys it on every push to main.
Only the Python standard library is used.
"""

from __future__ import annotations

import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from build_readme import (
    AREA_ICONS,
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


def venue_label(r: dict) -> str:
    venue = r.get("venue_short") or r.get("venue") or ""
    year = r.get("year", "")
    return f"{venue} {year}" if year and year not in venue else venue


# ------------------------------------------------------------------------- render
def card(r: dict, area: str, heading: str) -> str:
    tags = [f'<span class="tag venue">{esc(venue_label(r))}</span>']
    if r.get("modality"):
        tags.append(f'<span class="tag">{esc(r["modality"])}</span>')
    if r.get("jepa_variant") and r["jepa_variant"] != r["model_name"]:
        tags.append(f'<span class="tag">{esc(r["jepa_variant"])}</span>')
    if r.get("inclusion_type") == "JEPA-inspired Medical":
        tags.append('<span class="tag inspired">JEPA-inspired</span>')

    links = [f'<a href="{esc(r["paper_link"])}">Paper</a>']
    if has_code(r):
        m = GITHUB_RE.match(r["code_link"])
        if m:
            owner, repo = m.group(1), m.group(2).removesuffix(".git")
            badge = f"https://img.shields.io/github/stars/{owner}/{repo}?style=flat-square&logo=github&label=Code&color=24292f"
            links.append(
                f'<a href="{esc(r["code_link"])}"><img src="{esc(badge)}" alt="Official code on GitHub" '
                f'loading="lazy" height="20"></a>'
            )
        else:
            links.append(f'<a href="{esc(r["code_link"])}">Code</a>')
    if r.get("doi"):
        links.append(f'<a href="https://doi.org/{esc(r["doi"])}">DOI</a>')
    if r.get("project_link") and r["project_link"] not in (r.get("code_link"), r["paper_link"]):
        links.append(f'<a href="{esc(r["project_link"])}">Project</a>')

    text = " ".join(
        r.get(k, "") for k in ("model_name", "paper_name", "authors", "venue", "venue_short", "year",
                                "modality", "task", "jepa_variant", "medical_domain", "section")
    ).lower()
    parts = [
        f'<article class="card" data-area="{esc(area)}" data-code="{1 if has_code(r) else 0}" data-text="{esc(text)}">',
        f'<span class="model">{esc(r["model_name"])}</span>',
        f'<{heading} class="title"><a href="{esc(r["paper_link"])}">{esc(r["paper_name"])}</a></{heading}>',
    ]
    if r.get("authors"):
        parts.append(f'<p class="authors">{esc(short_authors(r["authors"]))}</p>')
    if r.get("task"):
        parts.append(f'<p class="task">{esc(r["task"])}</p>')
    parts.append(f'<div class="meta">{"".join(tags)}</div>')
    parts.append(f'<div class="links">{"".join(links)}</div>')
    parts.append("</article>")
    return "\n".join(parts)


def render_sections(rows: list[dict]) -> tuple[str, list[tuple[str, str, int]]]:
    by_section: dict[str, list[dict]] = {}
    for r in rows:
        by_section.setdefault(r["section"], []).append(r)

    areas: list[tuple[str, str, int]] = []  # (area id, title, count)
    out: list[str] = []
    open_area = None
    for s in ordered_sections(rows):
        parts = s.split(SEP)
        area = parts[0]
        if area != open_area:
            if open_area is not None:
                out.append("</section>")
            n = sum(len(v) for k, v in by_section.items() if k == area or k.startswith(area + SEP))
            icon = AREA_ICONS.get(area, "")
            areas.append((slug(area), area, n))
            out.append(f'<section class="area" id="{slug(area)}" data-area="{slug(area)}">')
            out.append(f'<h2><span aria-hidden="true">{icon}</span> {esc(area)} <span class="count">{n} papers</span></h2>')
            open_area = area
        if s not in by_section:
            continue
        heading = "h3"
        if len(parts) > 1:
            out.append(f'<h3 id="{slug(s)}">{esc(parts[-1])} <span class="count">{len(by_section[s])}</span></h3>')
            heading = "h4"
        out.append('<div class="grid">')
        out.extend(card(r, slug(area), heading) for r in sorted(by_section[s], key=sort_key))
        out.append("</div>")
    if open_area is not None:
        out.append("</section>")
    return "\n".join(out), areas


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
    sections, areas = render_sections(rows)
    years = sorted({r["year"] for r in rows})
    with_code = sum(1 for r in rows if has_code(r))
    description = (
        f"{len(rows)} curated medical JEPA papers: I-JEPA, V-JEPA and LeJEPA for MRI, CT, "
        "ultrasound, ECG, EEG, surgical video and EHR, with official code."
    )
    filters = ['<button class="chip-btn" type="button" data-area="all" aria-pressed="true">All</button>']
    for area_id, title, n in areas:
        icon = AREA_ICONS.get(title, "")
        filters.append(
            f'<button class="chip-btn" type="button" data-area="{area_id}" aria-pressed="false">'
            f"{icon} {esc(title)} ({n})</button>"
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
        "{{AREA_COUNT}}": str(len(areas)),
        "{{YEAR_SPAN}}": f"{years[0]}–{years[-1]}" if len(years) > 1 else years[0],
        "{{FILTERS}}": "".join(filters),
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
