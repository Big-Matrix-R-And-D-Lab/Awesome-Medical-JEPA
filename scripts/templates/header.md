# Awesome Medical JEPA [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![Papers](https://img.shields.io/badge/papers-{{TOTAL}}-blue)](#contents)
[![Official code](https://img.shields.io/badge/with%20official%20code-{{WITH_CODE}}-brightgreen)](#legend)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-orange.svg)](CONTRIBUTING.md)

> A curated list of papers that use **Joint-Embedding Predictive Architectures (JEPA)** in medicine and healthcare, covering medical imaging, physiological signals, surgical video, EHR and molecular biology.

**What is a JEPA?** A JEPA learns representations by *predicting in latent space*. A context encoder embeds a visible part of the input. A predictor then estimates the embeddings of masked or future target regions, which a separate target encoder (typically an EMA of the context encoder) produces. The model never reconstructs pixels or raw signal values, so it can concentrate on semantic structure and ignore low-level noise. That makes it a natural fit for medical data, where much of the variance in the raw input is acquisition noise. The original formulations are I-JEPA for images and V-JEPA for video; they are listed under [Foundations](#foundations).

## What gets listed

Every paper is tagged with one of three inclusion types:

| Type | Meaning |
| --- | --- |
| **Direct Medical JEPA** | Applies or extends a JEPA objective on medical or biomedical data. |
| **JEPA-inspired Medical** 🔸 | Medical work that adapts JEPA ideas (e.g. latent feature prediction) without being a named JEPA, or that benchmarks JEPA against other objectives. |
| **Foundational JEPA** | General-domain architectures and theory that medical JEPA work builds on. |

## Legend

- ⭐ badge in the **Code** column: an **official** implementation released by the authors has been verified. Third-party re-implementations are deliberately not listed.
- `—` in the **Code** column: no verified official code was located at the time of curation.
- 🔸 next to a model name: JEPA-inspired rather than a direct JEPA (see above).
- Venues marked *arXiv* or *bioRxiv* are preprints that have not (yet) been peer reviewed.

## At a glance

{{STATS}}

## Contents

{{TOC}}
