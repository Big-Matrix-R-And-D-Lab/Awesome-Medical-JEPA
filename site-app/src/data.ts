// Data contract with scripts/build_site.py, which injects SiteData as JSON into
// <script id="site-data" type="application/json"> and also writes it to site/data.json.

export type Inclusion = "Direct Medical JEPA" | "JEPA-inspired Medical" | "Foundational JEPA"

export interface Paper {
  id: string
  model: string
  title: string
  url: string
  year: number
  venue: string
  venueFull: string
  authors: string[] // "First Last"
  area: string
  areaSlug: string
  subsection: string // "" when the paper sits directly under its area
  modality: string
  task: string
  variant: string
  domain: string
  inclusion: Inclusion
  code: string // official code URL or ""
  stars: number | null
  doi: string
  project: string
  dataset: string
}

export interface Area {
  name: string
  slug: string
  count: number
  subsections: { name: string; count: number }[]
}

export interface SiteData {
  repo: string
  updated: string
  papers: Paper[] // already in display order
  areas: Area[]
}

export async function loadSiteData(): Promise<SiteData> {
  const el = document.getElementById("site-data")
  if (el?.textContent && el.textContent.trim().startsWith("{")) {
    try {
      return JSON.parse(el.textContent) as SiteData
    } catch {
      /* fall through to data.json */
    }
  }
  const res = await fetch("data.json")
  if (!res.ok) throw new Error(`Could not load data.json (HTTP ${res.status})`)
  return (await res.json()) as SiteData
}

export const isPreprint = (p: Paper) => /arxiv|biorxiv|medrxiv/i.test(p.venue)

export function compact(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
}

export function shortAuthors(authors: string[]): string {
  const last = authors.map((a) => a.split(" ").slice(-1)[0])
  return last.length <= 3 ? last.join(", ") : `${last.slice(0, 3).join(", ")} et al.`
}

export function bibtex(p: Paper): string {
  const first = (p.authors[0] ?? "anon").split(" ").slice(-1)[0].toLowerCase().replace(/[^a-z]/g, "")
  const word = p.title.toLowerCase().split(/\W+/).find((w) => w.length > 3) ?? "paper"
  const fields: [string, string][] = [
    ["title", `{${p.title}}`],
    ["author", p.authors.join(" and ")],
    ["year", String(p.year)],
    ["howpublished", p.venueFull || p.venue],
    ["url", p.url],
  ]
  if (p.doi) fields.push(["doi", p.doi])
  const body = fields.map(([k, v]) => `  ${k.padEnd(12)} = {${v}}`).join(",\n")
  return `@misc{${first}${p.year}${word},\n${body}\n}`
}
