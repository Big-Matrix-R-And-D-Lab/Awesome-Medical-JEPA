# site-app

Source of the GitHub Pages site: React 18+ · TypeScript · Tailwind CSS · shadcn/ui, bundled into a
single HTML file with Parcel (scaffolded with the `web-artifacts-builder` skill).

You only need this folder to change the **design**. Adding or editing papers never needs Node:
edit `data/papers.csv`, and the Pages workflow runs `python scripts/build_site.py`, which injects the
paper data, SEO tags and a static fallback list into the committed bundle.

## How it fits together

| Piece | Role |
| --- | --- |
| `src/` | The app: header, hero with Fig. 1, explorer (tabs, search, filters, cards/table), detail sheet, theme picker. |
| `src/index.css` | Theme tokens. Five palettes (`data-palette` on `<html>`) × light/dark (`.dark`, via `next-themes`). |
| `src/data.ts` | The JSON contract written by `scripts/build_site.py` (`site_data()`). Keep both in sync. |
| `scripts/templates/site.html` | The committed bundle. `build_site.py` fills it; CI never runs Node. |

## Change the design

```bash
cd site-app
pnpm install
pnpm bundle      # parcel build + inline everything into bundle.html
pnpm template    # copy bundle.html to ../scripts/templates/site.html
cd ..
python scripts/build_site.py   # then open site/index.html
```

`pnpm dev` also works for quick iteration; it loads `data.json`, so copy `site/data.json` into a
`public/` folder first.

### Windows notes

- **Long paths:** Parcel fails with `ENOENT ... C:\?\C:\...` when the checkout path plus `node_modules`
  passes 260 characters (for example inside `.claude/worktrees/`). Copy this folder to a short path
  such as `C:\Users\<you>\amj-build` (without `node_modules`), run the steps there, and copy
  `bundle.html` back.
- **SWC cache:** if Parcel reports `ERR_SWC_NATIVE_CACHE`, set `SWC_NATIVE_BINDING_CACHE` to a short
  folder you own, e.g. `C:\Users\<you>\.swc-cache`.
