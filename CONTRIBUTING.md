# Contributing to Awesome Medical JEPA

Thanks for helping keep this list complete and accurate.

## How the list works

`README.md` is **generated**. The single source of truth is [`data/papers.csv`](data/papers.csv); `scripts/build_readme.py` turns it into the README. Please do not edit the README by hand, because the next build will overwrite your change.

To change the intro text, legend or footer, edit `scripts/templates/header.md` or `scripts/templates/footer.md`.

## Adding a paper

**Option A: open an issue.** Use the [Add a paper](../../issues/new?template=add-paper.yml) template, and a maintainer will add it.

**Option B: open a pull request.**

1. Add one row to `data/papers.csv` (columns are described below).
2. Run `python scripts/build_readme.py` (Python 3.9+, no packages needed). The script validates the CSV and stops with a clear message if something is wrong.
3. Commit both `data/papers.csv` and the regenerated `README.md`, then open the PR.

A GitHub Action re-runs the check on every PR and fails if the README is out of date.

## Inclusion criteria

A paper is eligible if it meets one of these:

- **Direct Medical JEPA**: it trains or adapts a JEPA-style objective (prediction of target embeddings in latent space) on medical or biomedical data.
- **JEPA-inspired Medical**: medical work that explicitly builds on JEPA ideas without being a direct JEPA, or that benchmarks JEPA against other self-supervised objectives.
- **Foundational JEPA**: general-domain architectures or theory that medical JEPA papers directly build on. This section is kept small on purpose.

Not eligible: papers that only cite JEPA in passing, generic masked-autoencoder or contrastive methods with no latent prediction, and blog posts without a paper.

## Code links

Only list **official** code released by the paper's authors, and set `official_code` to `Yes`. If you can only find a third-party re-implementation, leave `code_link` empty. A Hugging Face model card on its own does not count as a code repository.

## Column reference

| Column | Required | Description |
| --- | :---: | --- |
| `paper_name` | ✅ | Exact title, as on the publisher or arXiv record. |
| `paper_link` | ✅ | Prefer the publisher page or DOI link; use arXiv/bioRxiv for preprints. |
| `code_link` | | Official repository URL. GitHub links get a star badge automatically. |
| `year` | ✅ | Four-digit publication year (use the proceedings year for published papers). |
| `authors` | | `Last, First; Last, First; ...` |
| `venue` | | Full venue name, e.g. `MIDL 2026, PMLR 301:1430–1444`. |
| `venue_short` | | Short label shown in the README, e.g. `MIDL`, `NeurIPS`, `arXiv`. The year is appended automatically. |
| `section` | ✅ | Where the paper appears. Use an existing value, e.g. `Medical Imaging > Radiology` or `Physiological Signals > EEG`. A new value is allowed; add it to `SECTION_ORDER` in the script to control its position. |
| `category` | | Free-text research category. |
| `medical_domain` | | Clinical area, e.g. `Cardiology`, `Neurology`. |
| `modality` | | Data type shown in the README, e.g. `Chest X-ray`, `12-lead ECG`. |
| `task` | | Short task description, shown under the title. |
| `jepa_variant` | | Which JEPA flavour, e.g. `I-JEPA adaptation`, `V-JEPA`, `LeJEPA / SIGReg`. |
| `model_name` | ✅ | Name shown in bold in the README. |
| `doi` | | DOI without the `https://doi.org/` prefix. |
| `project_link` | | Project page, if different from the code repo. |
| `dataset_link` | | Released dataset, if any. |
| `code_status` | | `Verified official repository` or `No verified official implementation located`. |
| `official_code` | | `Yes` or `No`. |
| `source_in_survey` | | `Yes` if the paper is covered in the companion survey. |
| `inclusion_type` | ✅ | `Direct Medical JEPA`, `JEPA-inspired Medical` or `Foundational JEPA`. |
| `verification_status` | | How the metadata was checked. |
| `notes` | | Curation notes (not shown in the README). |

## Corrections

Wrong venue, dead link, or a paper that has since been published? Open an issue or edit the row directly. Corrections are as valuable as additions.
