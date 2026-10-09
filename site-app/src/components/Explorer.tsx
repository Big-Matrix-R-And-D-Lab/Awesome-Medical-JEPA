import { useEffect, useMemo, useRef, useState } from "react"
import { LayoutGrid, Rows3, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Area, Paper } from "@/data"
import { cn } from "@/lib/utils"
import { PaperCard, PaperSheet, PaperTable } from "./Papers"

type Sort = "curated" | "newest" | "stars" | "az"
type View = "cards" | "table"

const ALL = "all"

function haystack(p: Paper) {
  return [p.model, p.title, p.authors.join(" "), p.venue, p.venueFull, p.modality, p.task, p.variant, p.domain, p.area, p.subsection, String(p.year)]
    .join(" ")
    .toLowerCase()
}

function readHashArea(areas: Area[]) {
  const h = decodeURIComponent(window.location.hash.slice(1))
  return areas.some((a) => a.slug === h) ? h : ALL
}

export function Explorer({ papers, areas }: { papers: Paper[]; areas: Area[] }) {
  const [area, setArea] = useState(() => readHashArea(areas))
  const [sub, setSub] = useState<string>(ALL)
  const [query, setQuery] = useState("")
  const [codeOnly, setCodeOnly] = useState(false)
  const [year, setYear] = useState<string>(ALL)
  const [sort, setSort] = useState<Sort>("curated")
  const [view, setView] = useState<View>("cards")
  const [open, setOpen] = useState<Paper | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const index = useMemo(() => new Map(papers.map((p) => [p.id, haystack(p)])), [papers])
  const years = useMemo(() => [...new Set(papers.map((p) => p.year))].sort((a, b) => b - a), [papers])
  const currentArea = areas.find((a) => a.slug === area)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === "/" && !/input|textarea|select/i.test(t.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function chooseArea(slug: string) {
    setArea(slug)
    setSub(ALL)
    history.replaceState(null, "", slug === ALL ? "#papers" : `#${slug}`)
  }

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    const out = papers.filter(
      (p) =>
        (area === ALL || p.areaSlug === area) &&
        (sub === ALL || p.subsection === sub) &&
        (!codeOnly || p.code) &&
        (year === ALL || String(p.year) === year) &&
        terms.every((t) => index.get(p.id)!.includes(t)),
    )
    if (sort === "newest") out.sort((a, b) => b.year - a.year || a.model.localeCompare(b.model))
    if (sort === "stars") out.sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1))
    if (sort === "az") out.sort((a, b) => a.model.localeCompare(b.model))
    return out
  }, [papers, index, area, sub, codeOnly, year, query, sort])

  // In curated order, group by area and section; other sorts show one flat list.
  const groups = useMemo(() => {
    if (sort !== "curated") return [{ key: "flat", area: "", subsection: "", items: filtered }]
    const g: { key: string; area: string; subsection: string; items: Paper[] }[] = []
    for (const p of filtered) {
      const key = `${p.area}|${p.subsection}`
      const last = g[g.length - 1]
      if (last?.key === key) last.items.push(p)
      else g.push({ key, area: p.area, subsection: p.subsection, items: [p] })
    }
    return g
  }, [filtered, sort])

  const active = query || codeOnly || year !== ALL || sub !== ALL
  function reset() {
    setQuery("")
    setCodeOnly(false)
    setYear(ALL)
    setSub(ALL)
  }

  return (
    <section id="papers" className="scroll-mt-20">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-4xl tracking-tight">Papers</h2>
        <p className="text-muted-foreground">
          Every paper links to its official record. Click a title for full details and a ready-to-paste citation.
        </p>
      </div>

      <div className="z-20 -mx-4 mt-6 border-y bg-background px-4 py-3 sm:mx-0 sm:rounded-lg sm:border sm:px-3 md:sticky md:top-16 md:bg-background/95 md:backdrop-blur">
        <Tabs value={area} onValueChange={chooseArea} className="min-w-0">
          <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
          <TabsList className="h-auto w-max justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value={ALL} className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All <span className="ml-1.5 font-mono text-xs opacity-70">{papers.length}</span>
            </TabsTrigger>
            {areas.map((a) => (
              <TabsTrigger
                key={a.slug}
                value={a.slug}
                className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {a.name} <span className="ml-1.5 font-mono text-xs opacity-70">{a.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          </div>
        </Tabs>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="paper-search"
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search model, title, author, modality"
              className="h-9 pl-8 pr-10"
              aria-label="Search papers"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
              /
            </kbd>
          </div>
          <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
            <Switch id="code-only" checked={codeOnly} onCheckedChange={setCodeOnly} />
            <Label htmlFor="code-only" className="cursor-pointer text-sm font-normal">
              Official code
            </Label>
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 w-[7.5rem]" aria-label="Year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="curated">By section</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="stars">Most GitHub stars</SelectItem>
              <SelectItem value="az">Model A–Z</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as View)} className="rounded-md border p-0.5">
            <ToggleGroupItem value="cards" size="sm" aria-label="Card view" className="h-8 w-8 p-0">
              <LayoutGrid />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" size="sm" aria-label="Table view" className="h-8 w-8 p-0">
              <Rows3 />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {currentArea && currentArea.subsections.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[{ name: ALL, count: currentArea.count }, ...currentArea.subsections].map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSub(s.name)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  sub === s.name ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.name === ALL ? "All sections" : s.name}
                <span className="ml-1.5 font-mono opacity-70">{s.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
        <span>
          Showing <span className="font-mono text-foreground">{filtered.length}</span> of {papers.length} papers
        </span>
        {active && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={reset}>
            <X className="!size-3.5" /> Clear filters
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-12 text-center">
          <p className="font-medium">No papers match these filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a model such as EchoJEPA, a modality such as EEG, or an author.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={reset}>Clear filters</Button>
        </div>
      ) : view === "table" ? (
        <div className="mt-4">
          <PaperTable papers={filtered} onOpen={setOpen} />
        </div>
      ) : (
        <div className="mt-2 space-y-10">
          {groups.map((g, i) => (
            <div key={g.key}>
              {g.area && (area === ALL ? g.area !== groups[i - 1]?.area : true) && area === ALL && (
                <h3 className="mb-1 mt-8 font-serif text-3xl tracking-tight">{g.area}</h3>
              )}
              {g.subsection && (
                <div className="mb-3 mt-4 flex items-center gap-3">
                  <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-primary">{g.subsection}</span>
                  <span className="h-px flex-1 bg-border" />
                  <span className="font-mono text-xs text-muted-foreground">{g.items.length}</span>
                </div>
              )}
              <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3", !g.area && "mt-4")}>
                {g.items.map((p) => (
                  <PaperCard key={p.id} paper={p} onOpen={setOpen} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PaperSheet paper={open} onClose={() => setOpen(null)} />
    </section>
  )
}
