<div align="center">

<img src="assets/banner.svg" alt="Awesome Medical JEPA: Joint-Embedding Predictive Architectures in medicine and healthcare" width="100%">

# Awesome Medical JEPA

[![Awesome](https://awesome.re/badge-flat2.svg)](https://awesome.re)
[![Papers](https://img.shields.io/badge/papers-{{TOTAL}}-0d9488?style=flat-square)](#contents)
[![Official code](https://img.shields.io/badge/official%20code-{{WITH_CODE}}-2ea44f?style=flat-square&logo=github)](#how-to-read-this-list)
[![Last commit](https://img.shields.io/github/last-commit/Big-Matrix-R-And-D-Lab/Awesome-Medical-JEPA?style=flat-square&label=updated&color=6e40c9)](../../commits/main)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-f59e0b?style=flat-square)](CONTRIBUTING.md)
[![License: CC0-1.0](https://img.shields.io/badge/license-CC0--1.0-64748b?style=flat-square)](LICENSE)

A curated list of papers and code that use **Joint-Embedding Predictive Architectures (JEPA)**, including I-JEPA, V-JEPA and LeJEPA,<br>
for self-supervised learning in medicine and healthcare: medical imaging, physiological signals, surgical video, EHR and molecular biology.

**[🌐 Website](https://big-matrix-r-and-d-lab.github.io/Awesome-Medical-JEPA/)** &nbsp;·&nbsp; **[Browse papers](#contents)** &nbsp;·&nbsp; **[What is a JEPA?](#what-is-a-jepa)** &nbsp;·&nbsp; **[Add a paper](../../issues/new?template=add-paper.yml)** &nbsp;·&nbsp; **[Contribute](#contributing)**

</div>

## What is a JEPA?

A JEPA learns representations by *predicting in latent space*. A context encoder embeds a visible part of the input. A predictor then estimates the embeddings of masked or future target regions, which a separate target encoder (typically an EMA of the context encoder) produces. The model never reconstructs pixels or raw signal values, so it can concentrate on semantic structure and ignore low-level noise. That makes it a natural fit for medical data, where much of the variance in the raw input is acquisition noise.

```mermaid
flowchart LR
    X["Visible context"] --> EX["Context encoder"] --> P["Predictor"] --> SP["Predicted embeddings"]
    Y["Masked targets"] --> EY["Target encoder (EMA)"] --> ST["Target embeddings"]
    SP -. "latent loss" .- ST
```

The original formulations are I-JEPA for images and V-JEPA for video; they are listed under [Foundations](#-foundations).

## How to read this list

| Inclusion type | Meaning | How it appears below |
| --- | --- | --- |
| **Direct Medical JEPA** | Applies or extends a JEPA objective on medical or biomedical data. | Model name only |
| **JEPA-inspired Medical** | Adapts JEPA ideas (e.g. latent feature prediction) without being a named JEPA, or benchmarks JEPA against other objectives. | 🔸 after the model name |
| **Foundational JEPA** | General-domain architectures and theory that medical JEPA work builds on. | Listed under [Foundations](#-foundations) |

> [!NOTE]
> The **Code** column links only to **official** implementations released by the authors, with live GitHub stars. Third-party re-implementations are deliberately not listed, and `—` means no official code was located at curation time. Venues shown as *arXiv* or *bioRxiv* are preprints that have not (yet) been peer reviewed.

## At a glance

**{{TOTAL}}** papers &nbsp;·&nbsp; **{{WITH_CODE}}** with official code &nbsp;·&nbsp; **{{AREA_COUNT}}** research areas

{{YEARS}}

## Contents

{{TOC}}
