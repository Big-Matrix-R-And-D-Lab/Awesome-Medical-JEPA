import { useEffect, useState } from "react"
import { ArrowRight, BookOpen, GitPullRequest, Plus, Quote, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Explorer } from "@/components/Explorer"
import { JepaFigure } from "@/components/JepaFigure"
import { GitHubMark } from "@/components/Papers"
import { ThemePicker } from "@/components/ThemePicker"
import { compact, loadSiteData, type SiteData } from "@/data"
import { cn } from "@/lib/utils"

function Logo() {
  return (
    <svg viewBox="0 0 30 30" className="size-6" aria-hidden>
      <g className="fill-primary">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="11.5" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="11.5" width="7" height="7" rx="1.5" />
        <rect x="3" y="20" width="7" height="7" rx="1.5" />
        <rect x="20" y="20" width="7" height="7" rx="1.5" />
      </g>
      <g className="fill-target">
        <rect x="20" y="3" width="7" height="7" rx="1.5" />
        <rect x="11.5" y="11.5" width="7" height="7" rx="1.5" />
        <rect x="20" y="11.5" width="7" height="7" rx="1.5" />
        <rect x="11.5" y="20" width="7" height="7" rx="1.5" />
      </g>
    </svg>
  )
}

// Websites cannot star a repository for the visitor (GitHub requires the visitor's own sign-in),
// so the button opens the repository, where Star is one click away.
function useLiveStars(repo: string, initial: number | null) {
  const [stars, setStars] = useState(initial)
  useEffect(() => setStars(initial), [initial])
  useEffect(() => {
    const m = repo.match(/github\.com\/([^/]+)\/([^/#?]+)/)
    if (!m) return
    fetch(`https://api.github.com/repos/${m[1]}/${m[2]}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => typeof d?.stargazers_count === "number" && setStars(d.stargazers_count))
      .catch(() => {})
  }, [repo])
  return stars
}

function StarButton({ repo, stars, size = "sm", label = "Star" }: {
  repo: string; stars: number | null; size?: "sm" | "lg"; label?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={repo}
          target="_blank"
          rel="noreferrer"
          aria-label={`${label.includes("GitHub") ? label : `${label} on GitHub`}${stars !== null ? `, ${stars} stars` : ""}`}
          className={cn(
            "inline-flex items-stretch overflow-hidden rounded-md border bg-background font-medium shadow-sm transition-colors hover:border-primary/60",
            size === "lg" ? "h-10 text-sm" : "h-8 text-xs",
          )}
        >
          <span className={cn("flex items-center gap-1.5 hover:bg-accent", size === "lg" ? "px-4" : "px-2.5")}>
            <Star className={cn("fill-target text-target", size === "lg" ? "size-4" : "size-3.5")} />
            {label}
          </span>
          {stars !== null && (
            <span className={cn("flex items-center border-l bg-muted/60 font-mono tabular-nums", size === "lg" ? "px-3" : "px-2")}>
              {compact(stars)}
            </span>
          )}
        </a>
      </TooltipTrigger>
      <TooltipContent>Opens the repository on GitHub, where Star is one click</TooltipContent>
    </Tooltip>
  )
}

function Header({ repo, stars }: { repo: string; stars: number | null }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Logo />
          <span>Awesome Medical JEPA</span>
        </a>
        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Sections">
          <Button asChild variant="ghost" size="sm"><a href="#papers">Papers</a></Button>
          <Button asChild variant="ghost" size="sm"><a href="#what-is-jepa">What is a JEPA?</a></Button>
          <Button asChild variant="ghost" size="sm"><a href="#contribute">Contribute</a></Button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="GitHub repository">
            <a href={repo} target="_blank" rel="noreferrer">
              <GitHubMark />
            </a>
          </Button>
          <StarButton repo={repo} stars={stars} />
          <ThemePicker />
        </div>
      </div>
    </header>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1 border-l pl-4 first:border-l-0 first:pl-0">
      <span className="font-mono text-2xl font-medium tabular-nums tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function Hero({ data, stars }: { data: SiteData; stars: number | null }) {
  const years = data.papers.map((p) => p.year)
  const withCode = data.papers.filter((p) => p.code).length
  return (
    <section id="top" className="grid items-center gap-12 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
      <div className="flex min-w-0 flex-col gap-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Curated reading list <span className="mx-1 text-primary">·</span> updated {data.updated}
        </p>
        <h1 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          Awesome Medical <em className="text-primary">JEPA</em>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          Papers and official code that use <span className="text-foreground">Joint-Embedding Predictive Architectures</span>,
          including I-JEPA, V-JEPA and LeJEPA, for self-supervised learning on medical data: imaging, ECG and EEG, surgical
          video, health records and molecular biology.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <Stat value={data.papers.length} label="papers" />
          <Stat value={withCode} label="with official code" />
          <Stat value={data.areas.length} label="research areas" />
          <Stat value={`${Math.min(...years)}–${Math.max(...years)}`} label="years covered" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="gap-2">
            <a href="#papers">
              Browse papers <ArrowRight />
            </a>
          </Button>
          <StarButton repo={data.repo} stars={stars} size="lg" label="Star on GitHub" />
          <Button asChild size="lg" variant="ghost" className="gap-2">
            <a href={`${data.repo}/issues/new?template=add-paper.yml`} target="_blank" rel="noreferrer">
              <Plus /> Suggest a paper
            </a>
          </Button>
        </div>
      </div>
      <div className="min-w-0 rounded-xl border bg-card p-5 sm:p-7">
        <JepaFigure />
      </div>
    </section>
  )
}

const INCLUSION = [
  {
    name: "Direct Medical JEPA",
    body: "Applies or extends a JEPA objective on medical or biomedical data.",
    mark: "bg-primary",
  },
  {
    name: "JEPA-inspired",
    body: "Adapts the idea without being a named JEPA, or benchmarks JEPA against other objectives. Tagged on each card.",
    mark: "bg-target",
  },
  {
    name: "Foundational JEPA",
    body: "General-domain architectures and theory that medical work builds on, listed under Foundations.",
    mark: "bg-muted-foreground",
  },
]

function About() {
  return (
    <section id="what-is-jepa" className="grid gap-10 border-t py-16 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-4">
        <h2 className="font-serif text-4xl tracking-tight">What is a JEPA?</h2>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          A Joint-Embedding Predictive Architecture learns by predicting in latent space. A context encoder embeds the
          visible part of an input. A predictor then estimates the embeddings of masked or future target regions, which a
          separate target encoder, usually an exponential moving average of the context encoder, produces.
        </p>
        <p className="max-w-prose leading-relaxed text-muted-foreground">
          The model never reconstructs pixels or raw signal values, so it spends its capacity on anatomy and physiology
          rather than on scanner noise, compression artefacts and electrode drift.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">How papers are tagged</h3>
        {INCLUSION.map((i) => (
          <div key={i.name} className="flex gap-4 rounded-lg border bg-card p-4">
            <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${i.mark}`} aria-hidden />
            <div>
              <p className="font-medium">{i.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{i.body}</p>
            </div>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">
          Code links point only to official author implementations. Venues in italics are preprints.
        </p>
      </div>
    </section>
  )
}

function Contribute({ repo }: { repo: string }) {
  const items = [
    { icon: Plus, title: "Suggest a paper", body: "Open an issue with the Add a paper form.", href: `${repo}/issues/new?template=add-paper.yml` },
    { icon: GitPullRequest, title: "Open a pull request", body: "Add a row to data/papers.csv; the site rebuilds itself.", href: `${repo}/blob/main/CONTRIBUTING.md` },
    { icon: Quote, title: "Cite this list", body: "Use the Cite this repository button on GitHub.", href: `${repo}/blob/main/CITATION.cff` },
  ]
  return (
    <section id="contribute" className="border-t py-16">
      <h2 className="font-serif text-4xl tracking-tight">Contribute</h2>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Know a paper that belongs here, or spotted a wrong link? Corrections are as valuable as additions.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, title, body, href }) => (
          <a key={title} href={href} target="_blank" rel="noreferrer"
            className="group flex flex-col gap-2 rounded-lg border bg-card p-5 transition-colors hover:border-primary/50">
            <Icon className="size-5 text-primary" />
            <span className="font-medium group-hover:underline">{title}</span>
            <span className="text-sm text-muted-foreground">{body}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

function Footer({ repo }: { repo: string }) {
  return (
    <footer className="border-t py-10 text-sm text-muted-foreground">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <span className="flex items-center gap-2">
          <BookOpen className="size-4" /> Generated from{" "}
          <a className="underline underline-offset-4 hover:text-foreground" href={`${repo}/blob/main/data/papers.csv`}>data/papers.csv</a>
        </span>
        <span>
          List released under{" "}
          <a className="underline underline-offset-4 hover:text-foreground" href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>.
          Papers and code keep their own licenses.
        </span>
      </div>
    </footer>
  )
}

function Loading() {
  return (
    <div className="grid gap-4 py-16 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}
    </div>
  )
}

export default function App() {
  const [data, setData] = useState<SiteData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSiteData().then(setData).catch((e: Error) => setError(e.message))
  }, [])

  const repo = data?.repo ?? "https://github.com/Big-Matrix-R-And-D-Lab/Awesome-Medical-JEPA"
  const stars = useLiveStars(repo, data?.repoStars ?? null)
  return (
    <>
      <Header repo={repo} stars={stars} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {error && <p className="py-16 text-destructive">Could not load the paper list: {error}</p>}
        {!data && !error && <Loading />}
        {data && (
          <>
            <Hero data={data} stars={stars} />
            <About />
            <div className="border-t pt-16">
              <Explorer papers={data.papers} areas={data.areas} />
            </div>
            <Contribute repo={repo} />
          </>
        )}
        <Footer repo={repo} />
      </main>
    </>
  )
}
