// Fig. 1: the JEPA training signal. Colours come from theme tokens, so it follows every palette.
const MASK = ["cccc..", "ctt.cc", "ctt.cc", "cc.cct", ".cccct", "cc.c.."]
const CELL = 20
const PITCH = 24

function Arrow({ d, head }: { d: string; head: string }) {
  return (
    <>
      <path d={d} className="fill-none stroke-muted-foreground" strokeWidth={1.5} />
      <path d={head} className="fill-muted-foreground" />
    </>
  )
}

function Box({ x, y, w, label, sub }: { x: number; y: number; w: number; label: string; sub?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={40} rx={8} className="fill-card stroke-border" strokeWidth={1.5} />
      <text x={x + w / 2} y={y + 25} textAnchor="middle" className="fill-foreground font-sans text-[13px] font-medium">
        {label}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + 58} textAnchor="middle" className="fill-muted-foreground font-mono text-[10.5px]">
          {sub}
        </text>
      )}
    </g>
  )
}

function Embedding({ x, y }: { x: number; y: number }) {
  return (
    <g className="fill-target">
      {[1, 0.75, 0.55, 0.85].map((o, i) => (
        <rect key={i} x={x + i * 15} y={y} width={11} height={26} rx={2} opacity={o} />
      ))}
    </g>
  )
}

export function JepaFigure() {
  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 560 230"
        className="h-auto w-full"
        role="img"
        aria-labelledby="fig1-title"
      >
        <title id="fig1-title">
          JEPA training: visible context patches are encoded and used to predict the embeddings of masked target patches.
        </title>
        {MASK.flatMap((row, y) =>
          row.split("").map((ch, x) => (
            <rect
              key={`${x}-${y}`}
              x={8 + x * PITCH}
              y={30 + y * PITCH}
              width={CELL}
              height={CELL}
              rx={3}
              className={ch === "c" ? "fill-primary" : ch === "t" ? "fill-target" : "fill-patch"}
            />
          )),
        )}
        <Box x={186} y={16} w={130} label="Context encoder" />
        <Box x={342} y={16} w={94} label="Predictor" />
        <Box x={186} y={150} w={130} label="Target encoder" sub="EMA of context encoder" />

        <Arrow d="M156 78 H168 V36 H178" head="M178 31 L186 36 L178 41 z" />
        <Arrow d="M316 36 H334" head="M334 31 L342 36 L334 41 z" />
        <Arrow d="M436 36 H458" head="M458 31 L466 36 L458 41 z" />
        <Arrow d="M156 126 H168 V170 H178" head="M178 165 L186 170 L178 175 z" />
        <Arrow d="M316 170 H458" head="M458 165 L466 170 L458 175 z" />

        <Embedding x={472} y={23} />
        <Embedding x={472} y={157} />
        <text x={502} y={15} textAnchor="middle" className="fill-muted-foreground font-mono text-[10.5px]">
          predicted
        </text>
        <text x={502} y={200} textAnchor="middle" className="fill-muted-foreground font-mono text-[10.5px]">
          target
        </text>
        <path d="M502 56 V150" className="fill-none stroke-target" strokeWidth={1.5} strokeDasharray="4 4" />
        <text x={510} y={107} className="fill-target font-mono text-[10.5px]">
          loss
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Fig. 1.</span> Visible context patches are encoded, and a
        predictor estimates the embeddings of the masked target patches. The loss is measured between embeddings,
        never pixels.
      </figcaption>
    </figure>
  )
}
