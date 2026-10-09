// Fig. 1: I-JEPA-style training, matching assets/social-preview.svg.
// Context view -> context encoder f_θ -> predictor g_φ (+ target positions) -> predicted ŝ_y.
// Full view -> target encoder (EMA of f_θ, no gradient) -> select target blocks -> s_y. L2 loss in latent space.
// Colours come from theme tokens, so the figure follows every palette and dark mode.

// c = visible context, t = target block (masked in the context view), . = patch not sampled
const MASK = ["ccc.t", "cttct", "cttcc", "cccc.", ".cttc"]
const CELL = 22
const PITCH = 26
const TOKENS = [false, true, false, true, false, true, true, false] // which output embeddings are target blocks

function Head({ x, y, dir = "right", className = "fill-muted-foreground" }: { x: number; y: number; dir?: "right" | "down"; className?: string }) {
  const d = dir === "right" ? `M${x - 9} ${y - 5.5} L${x} ${y} L${x - 9} ${y + 5.5} z` : `M${x - 5.5} ${y - 9} L${x} ${y} L${x + 5.5} ${y - 9} z`
  return <path d={d} className={className} />
}

function Line({ d, className = "stroke-muted-foreground" }: { d: string; className?: string }) {
  return <path d={d} className={`fill-none ${className}`} strokeWidth={1.75} />
}

function Grid({ x, y, view }: { x: number; y: number; view: "context" | "full" }) {
  return (
    <g>
      {MASK.flatMap((row, r) =>
        row.split("").map((ch, c) => {
          const common = { x: x + c * PITCH, y: y + r * PITCH, width: CELL, height: CELL, rx: 3 }
          if (view === "context") {
            if (ch === "c") return <rect key={`${r}${c}`} {...common} className="fill-primary" />
            if (ch === "t") return <rect key={`${r}${c}`} {...common} className="fill-background stroke-target" strokeWidth={1.5} strokeDasharray="3 2.5" />
            return <rect key={`${r}${c}`} {...common} className="fill-patch" />
          }
          return (
            <rect key={`${r}${c}`} {...common} className={ch === "t" ? "fill-primary/30 stroke-target" : "fill-primary/30"} strokeWidth={ch === "t" ? 2 : 0} />
          )
        }),
      )}
    </g>
  )
}

function Box({ x, y, w, title, children }: { x: number; y: number; w: number; title: string; children: React.ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={58} rx={10} className="fill-card stroke-border" strokeWidth={1.5} />
      <text x={x + w / 2} y={y + 27} textAnchor="middle" className="fill-foreground font-sans text-[16px] font-semibold">
        {title}
      </text>
      <text x={x + w / 2} y={y + 48} textAnchor="middle" className="fill-muted-foreground font-mono text-[14px]">
        {children}
      </text>
    </g>
  )
}

function Bars({ x, y, predicted }: { x: number; y: number; predicted?: boolean }) {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={x + i * 20}
          y={y}
          width={14}
          height={40}
          rx={3}
          className={predicted ? "fill-target/25 stroke-target" : "fill-target"}
          strokeWidth={predicted ? 1.5 : 0}
        />
      ))}
    </g>
  )
}

const sub = (s: string) => (
  <tspan baselineShift="sub" fontSize="0.78em">
    {s}
  </tspan>
)

export function JepaFigure() {
  return (
    <figure className="m-0">
      <div className="-mx-1 overflow-x-auto px-1">
        <svg viewBox="0 0 670 412" className="h-auto w-full min-w-[520px] sm:min-w-0" role="img" aria-labelledby="fig1-title fig1-desc">
          <title id="fig1-title">JEPA training</title>
          <desc id="fig1-desc">
            The context view, with target blocks masked, passes through the context encoder and the predictor, which also
            receives the target positions and outputs predicted embeddings. The full view passes through the target encoder,
            an exponential moving average of the context encoder that receives no gradient; the target-block embeddings are
            selected from its output. An L2 loss compares predicted and target embeddings in latent space.
          </desc>

          {/* inputs */}
          <text x={16} y={42} className="fill-muted-foreground font-mono text-[12.5px]">context view (targets masked)</text>
          <Grid x={16} y={53} view="context" />
          <text x={16} y={266} className="fill-muted-foreground font-mono text-[12.5px]">full view</text>
          <Grid x={16} y={277} view="full" />

          {/* encoders */}
          <Box x={172} y={87} w={170} title="Context encoder">f{sub("θ")}</Box>
          <Box x={172} y={311} w={170} title="Target encoder">EMA of f{sub("θ")}</Box>
          <text x={257} y={392} textAnchor="middle" className="fill-muted-foreground font-mono text-[12px]">no gradient (stop-grad)</text>
          <Line d="M146 116 H164" /><Head x={173} y={116} />
          <Line d="M146 340 H164" /><Head x={173} y={340} />

          {/* EMA weight update */}
          <path d="M257 149 V300" className="fill-none stroke-primary" strokeWidth={1.75} strokeDasharray="5 4" />
          <Head x={257} y={309} dir="down" className="fill-primary" />
          <text x={268} y={224} className="fill-primary font-mono text-[13px] font-medium">EMA</text>
          <text x={268} y={241} className="fill-primary font-mono text-[13px]">weights</text>

          {/* predictor, conditioned on target positions */}
          <Box x={374} y={87} w={120} title="Predictor">g{sub("φ")}</Box>
          <Line d="M342 116 H366" /><Head x={375} y={116} />
          <text x={434} y={20} textAnchor="middle" className="fill-muted-foreground font-mono text-[12px]">+ target positions</text>
          {[405, 426, 447].map((x) => (
            <rect key={x} x={x} y={32} width={16} height={16} rx={2} className="fill-background stroke-target" strokeWidth={1.5} strokeDasharray="3 2.5" />
          ))}
          <Line d="M434 52 V78" /><Head x={434} y={87} dir="down" />

          {/* predicted target embeddings */}
          <Line d="M494 116 H520" /><Head x={529} y={116} />
          <Bars x={532} y={96} predicted />
          <text x={616} y={123} className="fill-foreground font-serif text-[26px] italic">ŝ{sub("y")}</text>

          {/* target branch: all patch embeddings, then select the target blocks */}
          <Line d="M342 340 H366" /><Head x={375} y={340} />
          {TOKENS.map((isTarget, i) => (
            <rect key={i} x={378 + i * 17} y={320} width={12} height={40} rx={3} className={isTarget ? "fill-target" : "fill-muted-foreground/30"} />
          ))}
          <text x={443} y={392} textAnchor="middle" className="fill-muted-foreground font-mono text-[12px]">select target blocks</text>
          <Line d="M512 340 H520" /><Head x={529} y={340} />
          <Bars x={532} y={320} />
          <text x={616} y={347} className="fill-foreground font-serif text-[26px] italic">s{sub("y")}</text>

          {/* loss in latent space */}
          <path d="M569 142 V314" className="fill-none stroke-target" strokeWidth={2} strokeDasharray="5 4" />
          <text x={580} y={220} className="fill-target font-mono text-[13px] font-medium">L2 loss</text>
          <text x={580} y={238} className="fill-target font-mono text-[12px]">in latent</text>
          <text x={580} y={255} className="fill-target font-mono text-[12px]">space</text>
        </svg>
      </div>
    </figure>
  )
}
