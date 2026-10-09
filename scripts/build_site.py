#!/usr/bin/env python3
"""Generate the GitHub Pages site (site/) from data/papers.csv.

Usage:
    python scripts/build_site.py

The page itself is a React + shadcn/ui app (source in site-app/), bundled once into
scripts/templates/site.html. This script fills that bundle with the paper data, SEO tags,
JSON-LD and a static fallback list for crawlers, then writes site/index.html, site/data.json,
site/sitemap.xml, site/robots.txt and the social preview image. site/ is build output
(git-ignored); the Pages workflow runs this on every push to main. Standard library only.
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
TEMPLATE = TEMPLATES / "site.html"  # bundled site-app; rebuild it with site-app/README.md

# Paste the content value of Google Search Console's HTML-tag verification here.
GOOGLE_SITE_VERIFICATION = ""

TITLE = "Awesome Medical JEPA: JEPA Papers & Code for Healthcare AI"
FONTS = (
    "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700"
    "&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
)


def esc(text: str) -> str:
    return html.escape(text or "", quote=True)


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def person(name: str) -> str:
    """'Last, First' -> 'First Last'. Names already in 'First Last' form pass through."""
    if "," not in name:
        return " ".join(name.split())
    last, _, first = name.partition(",")
    return f"{first.strip()} {last.strip()}".strip()


def authors_of(r: dict) -> list[str]:
    return [person(a) for a in r.get("authors", "").split(";") if a.strip()]


def has_code(r: dict) -> bool:
    return r.get("official_code") == "Yes" and bool(r.get("code_link"))


def venue_name(r: dict) -> str:
    """Venue without the year (the year is shown separately)."""
    venue = r.get("venue_short") or r.get("venue") or ""
    return re.sub(r"\s*\b(19|20)\d\d\b", "", venue).strip() or venue


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


# --------------------------------------------------------------------------- data
def site_data(rows: list[dict], stars: dict[str, int], updated: str) -> dict:
    """The JSON contract read by site-app/src/data.ts."""
    by_section: dict[str, list[dict]] = {}
    for r in rows:
        by_section.setdefault(r["section"], []).append(r)

    papers, areas = [], []
    for s in ordered_sections(rows):
        parts = s.split(SEP)
        area = parts[0]
        if not areas or areas[-1]["name"] != area:
            areas.append({"name": area, "slug": slug(area), "count": 0, "subsections": []})
        if s not in by_section:
            continue
        if len(parts) > 1:
            areas[-1]["subsections"].append({"name": parts[-1], "count": len(by_section[s])})
        areas[-1]["count"] += len(by_section[s])
        for r in sorted(by_section[s], key=sort_key):
            papers.append({
                "id": slug(f"{r['model_name']} {r['year']} {r['paper_name'][:40]}"),
                "model": r["model_name"],
                "title": r["paper_name"],
                "url": r["paper_link"],
                "year": int(r["year"]),
                "venue": venue_name(r),
                "venueFull": r.get("venue", ""),
                "authors": authors_of(r),
                "area": area,
                "areaSlug": slug(area),
                "subsection": parts[-1] if len(parts) > 1 else "",
                "modality": r.get("modality", ""),
                "task": r.get("task", ""),
                "variant": r.get("jepa_variant", ""),
                "domain": r.get("medical_domain", ""),
                "inclusion": r.get("inclusion_type", ""),
                "code": r["code_link"] if has_code(r) else "",
                "stars": stars.get(r["code_link"]) if has_code(r) else None,
                "doi": r.get("doi", ""),
                "project": r.get("project_link", ""),
                "dataset": r.get("dataset_link", ""),
            })
    return {"repo": REPO_URL, "repoStars": stars.get(REPO_URL), "updated": updated,
            "papers": papers, "areas": areas}


def script_json(obj) -> str:
    # "</" must not appear inside a <script> block.
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def json_ld(rows: list[dict], description: str) -> str:
    items = []
    for i, r in enumerate(sorted(rows, key=sort_key), start=1):
        article = {
            "@type": "ScholarlyArticle",
            "name": r["paper_name"],
            "headline": r["paper_name"][:110],
            "url": r["paper_link"],
            "datePublished": r["year"],
            "author": [{"@type": "Person", "name": a} for a in authors_of(r)],
            "keywords": [k for k in ("JEPA", r.get("jepa_variant"), r.get("modality"), r.get("medical_domain")) if k],
        }
        if r.get("venue"):
            article["publisher"] = {"@type": "Organization", "name": r["venue"]}
        if r.get("doi"):
            article["sameAs"] = f"https://doi.org/{r['doi']}"
        items.append({"@type": "ListItem", "position": i, "item": article})
    return script_json({
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
    })


# ------------------------------------------------------------------------- render
def head_tags(description: str, rows: list[dict]) -> str:
    tags = [
        f'<meta name="description" content="{esc(description)}">',
        '<meta name="keywords" content="JEPA, medical JEPA, Joint-Embedding Predictive Architecture, I-JEPA, '
        'V-JEPA, LeJEPA, self-supervised learning, medical imaging, ECG, EEG, foundation models, healthcare AI">',
        f'<link rel="canonical" href="{SITE_URL}">',
        '<meta name="robots" content="index, follow">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Awesome Medical JEPA">',
        f'<meta property="og:title" content="{esc(TITLE)}">',
        f'<meta property="og:description" content="{esc(description)}">',
        f'<meta property="og:url" content="{SITE_URL}">',
        f'<meta property="og:image" content="{SITE_URL}social-preview.png">',
        '<meta property="og:image:width" content="1280">',
        '<meta property="og:image:height" content="640">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{esc(TITLE)}">',
        f'<meta name="twitter:description" content="{esc(description)}">',
        f'<meta name="twitter:image" content="{SITE_URL}social-preview.png">',
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        f'<link rel="stylesheet" href="{esc(FONTS)}">',
        f'<script type="application/ld+json">{json_ld(rows, description)}</script>',
    ]
    if GOOGLE_SITE_VERIFICATION:
        tags.insert(0, f'<meta name="google-site-verification" content="{esc(GOOGLE_SITE_VERIFICATION)}">')
    return "\n".join(tags)


def fallback_html(data: dict) -> str:
    """Plain HTML copy of the list inside #root. Crawlers and no-JS readers see it;
    React replaces it as soon as the app mounts."""
    out = [
        '<div style="max-width:60rem;margin:0 auto;padding:2rem 1rem;font-family:system-ui,sans-serif;line-height:1.5">',
        "<h1>Awesome Medical JEPA</h1>",
        f"<p>{len(data['papers'])} curated papers and official code using Joint-Embedding Predictive "
        "Architectures (JEPA) in medicine and healthcare.</p>",
    ]
    area = None
    for p in data["papers"]:
        if p["area"] != area:
            if area is not None:
                out.append("</ul>")
            area = p["area"]
            out.append(f"<h2>{esc(area)}</h2><ul>")
        code = f' · <a href="{esc(p["code"])}">code</a>' if p["code"] else ""
        out.append(
            f'<li><strong>{esc(p["model"])}</strong>: <a href="{esc(p["url"])}">{esc(p["title"])}</a> '
            f'({esc(p["venue"])} {p["year"]}){code}</li>'
        )
    if area is not None:
        out.append("</ul>")
    out.append(f'<p><a href="{REPO_URL}">Source on GitHub</a></p></div>')
    return "".join(out)


def sub_once(pattern: str, repl: str, text: str, what: str) -> str:
    new, n = re.subn(pattern, lambda _m: repl, text, count=1)
    if n != 1:
        raise SystemExit(f"build_site: could not find {what} in {TEMPLATE.name}; was the bundle rebuilt?")
    return new


def render(rows: list[dict], data: dict) -> str:
    description = (
        f"{len(rows)} curated medical JEPA papers: I-JEPA, V-JEPA and LeJEPA for MRI, CT, "
        "ultrasound, ECG, EEG, surgical video and EHR, with official code."
    )
    page = TEMPLATE.read_text(encoding="utf-8")
    page = sub_once(r"<title>.*?</title>", f"<title>{esc(TITLE)}</title>\n{head_tags(description, rows)}", page, "<title>")
    page = sub_once(
        r'<script id="?site-data"? type="?application/json"?>\{\}</script>',
        f'<script id="site-data" type="application/json">{script_json(data)}</script>',
        page, "the site-data script",
    )
    page = sub_once(r'<div id="?root"?></div>', f'<div id="root">{fallback_html(data)}</div>', page, "#root")
    return page


# --------------------------------------------------------------------------- main
def main() -> int:
    rows = load_rows()
    errors = validate(rows)
    if errors:
        print("Found problems in data/papers.csv:", *errors, sep="\n  - ", file=sys.stderr)
        return 1

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    stars = fetch_stars([REPO_URL] + [r["code_link"] for r in rows if has_code(r)])
    data = site_data(rows, stars, today)

    OUT.mkdir(exist_ok=True)
    (OUT / "index.html").write_text(render(rows, data), encoding="utf-8", newline="\n")
    (OUT / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    shutil.copyfile(ROOT / "assets" / "social-preview.png", OUT / "social-preview.png")
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
