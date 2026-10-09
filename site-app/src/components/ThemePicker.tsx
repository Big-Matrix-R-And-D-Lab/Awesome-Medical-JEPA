import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export const PALETTES = [
  { id: "hematoxylin", name: "Hematoxylin", note: "H&E stain indigo", swatch: ["#3d3f94", "#c23b6e"] },
  { id: "radiograph", name: "Radiograph", note: "Cool film cyan", swatch: ["#0b6e99", "#f26b1d"] },
  { id: "scrubs", name: "Scrubs", note: "Surgical teal", swatch: ["#147a6e", "#e0583f"] },
  { id: "iodine", name: "Iodine", note: "Contrast amber", swatch: ["#c0620c", "#1b77b8"] },
  { id: "graphite", name: "Graphite", note: "Monochrome", swatch: ["#1d1d21", "#dc2828"] },
] as const

export type PaletteId = (typeof PALETTES)[number]["id"]
const KEY = "amj-palette"

function readPalette(): PaletteId {
  try {
    const v = localStorage.getItem(KEY)
    if (PALETTES.some((p) => p.id === v)) return v as PaletteId
  } catch {
    /* storage blocked: use default */
  }
  return "hematoxylin"
}

export function usePalette() {
  const [palette, setPalette] = useState<PaletteId>(readPalette)
  useEffect(() => {
    document.documentElement.dataset.palette = palette
    try {
      localStorage.setItem(KEY, palette)
    } catch {
      /* ignore */
    }
  }, [palette])
  return [palette, setPalette] as const
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const [palette, setPalette] = usePalette()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="Theme settings">
          <Palette />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Mode
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <ToggleGroup
            type="single"
            value={theme ?? "system"}
            onValueChange={(v) => v && setTheme(v)}
            className="grid grid-cols-3 gap-1"
          >
            <ToggleGroupItem value="light" aria-label="Light mode" className="gap-1.5 text-xs">
              <Sun /> Light
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark mode" className="gap-1.5 text-xs">
              <Moon /> Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="Match system" className="gap-1.5 text-xs">
              <Monitor /> Auto
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Palette
        </DropdownMenuLabel>
        {PALETTES.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={(e) => {
              e.preventDefault()
              setPalette(p.id)
            }}
            className="gap-3"
          >
            <span className="flex shrink-0 overflow-hidden rounded-sm ring-1 ring-border" aria-hidden>
              <span className="h-5 w-3" style={{ background: p.swatch[0] }} />
              <span className="h-5 w-3" style={{ background: p.swatch[1] }} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.note}</span>
            </span>
            <Check className={cn("ml-auto", palette === p.id ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
