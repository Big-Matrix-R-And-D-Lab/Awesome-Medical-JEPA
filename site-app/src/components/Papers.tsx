import { useState } from "react"
import { ArrowUpRight, Check, Copy, FileText, Star } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { bibtex, compact, isPreprint, shortAuthors, type Paper } from "@/data"
import { cn } from "@/lib/utils"

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4 fill-current", className)}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function CodeLink({ paper, size = "sm" }: { paper: Paper; size?: "sm" | "default" }) {
  if (!paper.code) {
    return <span className="text-xs text-muted-foreground">No official code</span>
  }
  return (
    <Button asChild variant="outline" size={size} className="h-7 gap-1.5 px-2.5 text-xs">
      <a href={paper.code} target="_blank" rel="noreferrer">
        <GitHubMark className="size-3.5" />
        Code
        {paper.stars !== null && (
          <span className="flex items-center gap-0.5 font-mono text-muted-foreground">
            <Star className="!size-3 fill-current" />
            {compact(paper.stars)}
          </span>
        )}
      </a>
    </Button>
  )
}

function VenueTag({ paper }: { paper: Paper }) {
  return (
    <span className="shrink-0 text-right font-mono text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{paper.year}</span>
      <span className="mx-1.5 opacity-40">/</span>
      <span className={cn(isPreprint(paper) && "italic")}>{paper.venue}</span>
    </span>
  )
}

export function PaperCard({ paper, onOpen }: { paper: Paper; onOpen: (p: Paper) => void }) {
  return (
    <article className="group relative flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-5 transition-colors hover:border-primary/50">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-primary">{paper.model}</span>
          {paper.inclusion === "JEPA-inspired Medical" && (
            <Badge variant="outline" className="border-target/40 px-1.5 py-0 text-[11px] font-medium text-target">
              JEPA-inspired
            </Badge>
          )}
        </div>
        <VenueTag paper={paper} />
      </div>
      <h3 className="text-[15.5px] font-semibold leading-snug">
        <button
          type="button"
          onClick={() => onOpen(paper)}
          className="text-left decoration-primary/40 underline-offset-4 hover:underline focus-visible:underline"
        >
          {paper.title}
        </button>
      </h3>
      <p className="-mt-1 text-sm text-muted-foreground">{shortAuthors(paper.authors)}</p>
      {paper.task && <p className="text-sm leading-relaxed text-foreground/80">{paper.task}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {paper.modality && (
          <Badge variant="secondary" className="max-w-full truncate font-normal">
            {paper.modality}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
          <a href={paper.url} target="_blank" rel="noreferrer">
            <FileText className="!size-3.5" /> Paper
          </a>
        </Button>
        <CodeLink paper={paper} />
        <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => onOpen(paper)}>
          Details
        </Button>
      </div>
    </article>
  )
}

export function PaperTable({ papers, onOpen }: { papers: Paper[]; onOpen: (p: Paper) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Year</TableHead>
            <TableHead className="w-44">Model</TableHead>
            <TableHead>Paper</TableHead>
            <TableHead className="w-32">Venue</TableHead>
            <TableHead className="w-36 text-right">Code</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {papers.map((p) => (
            <TableRow key={p.id} className="cursor-pointer" onClick={() => onOpen(p)}>
              <TableCell className="font-mono text-xs">{p.year}</TableCell>
              <TableCell className="font-medium text-primary">{p.model}</TableCell>
              <TableCell>
                <div className="font-medium leading-snug">{p.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {shortAuthors(p.authors)} · {p.modality}
                </div>
              </TableCell>
              <TableCell className={cn("text-xs text-muted-foreground", isPreprint(p) && "italic")}>{p.venue}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <CodeLink paper={p} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

export function PaperSheet({ paper, onClose }: { paper: Paper | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const cite = paper ? bibtex(paper) : ""

  async function copy() {
    try {
      await navigator.clipboard.writeText(cite)
      setCopied(true)
      toast.success("BibTeX copied")
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Copy failed. Select the citation text and copy it manually.")
    }
  }

  return (
    <Sheet open={paper !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {paper && (
          <>
            <SheetHeader className="space-y-3 pr-6 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-primary">{paper.model}</span>
                <Badge variant={paper.inclusion === "JEPA-inspired Medical" ? "outline" : "secondary"}
                  className={cn("font-normal", paper.inclusion === "JEPA-inspired Medical" && "border-target/40 text-target")}>
                  {paper.inclusion}
                </Badge>
              </div>
              <SheetTitle className="font-serif text-3xl font-normal leading-tight">{paper.title}</SheetTitle>
              <SheetDescription>{paper.authors.join(", ")}</SheetDescription>
            </SheetHeader>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-1.5">
                <a href={paper.url} target="_blank" rel="noreferrer">
                  Read paper <ArrowUpRight />
                </a>
              </Button>
              <CodeLink paper={paper} size="default" />
              {paper.doi && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">DOI</a>
                </Button>
              )}
              {paper.project && (
                <Button asChild variant="ghost" size="sm">
                  <a href={paper.project} target="_blank" rel="noreferrer">Project</a>
                </Button>
              )}
              {paper.dataset && (
                <Button asChild variant="ghost" size="sm">
                  <a href={paper.dataset} target="_blank" rel="noreferrer">Dataset</a>
                </Button>
              )}
            </div>

            <Separator className="my-5" />
            <dl className="divide-y">
              <Field label="Venue">{paper.venueFull || paper.venue}</Field>
              <Field label="Year">{paper.year}</Field>
              <Field label="Section">{paper.subsection ? `${paper.area} › ${paper.subsection}` : paper.area}</Field>
              <Field label="Modality">{paper.modality}</Field>
              <Field label="Task">{paper.task}</Field>
              <Field label="JEPA variant">{paper.variant}</Field>
              <Field label="Clinical domain">{paper.domain}</Field>
            </dl>

            <Separator className="my-5" />
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Cite</h4>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={copy}>
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy BibTeX"}
              </Button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-[11.5px] leading-relaxed">
              {cite}
            </pre>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
