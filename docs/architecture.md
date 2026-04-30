# Plume — Architecture

## Overview

Plume is a multi-agent editorial AI engine that transforms raw ideas into publishable content through a controlled workflow.

```
Brief → Plan → Write → Humanize → Brand Voice → Critique → Quality → Export
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind (Vercel) |
| Backend | Node.js / Express (Hostinger VPS + Docker) |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| LLM | OpenRouter (multi-model) |
| Streaming | SSE via persistent Express |
| Reverse proxy | Nginx |

## Deployment Architecture

```
┌─────────────────┐        ┌──────────────────────────────────────┐
│     VERCEL      │        │          HOSTINGER VPS               │
│                 │        │                                      │
│  React + Vite   │──────▶ │  Nginx :443                          │
│  (frontend)     │  HTTPS │     └──▶ Express :3000 (Docker)      │
└─────────────────┘        │              │                       │
                            │              ├── /api/agents/*       │
                            │              ├── /api/workflows/*    │
                            │              └── /api/.../stream SSE │
                            └──────────────────────────────────────┘
                                        │
                                        ▼
                            ┌─────────────────────┐
                            │      SUPABASE        │
                            │  PostgreSQL + Auth   │
                            └─────────────────────┘
```

## EVV Pattern (Execute-Verify-Validate)

Every content generation step follows the EVV loop:

1. **Execute** — Agent generates content
2. **Verify** — QualityAgent scores (10 criteria, weighted)
3. **Validate** — ValidatorAgent decides: ACCEPTÉ / À CORRIGER / BLOQUÉ

Rules:
- Max 2 automatic corrections
- After 2 failed attempts → human review required
- Never infinite loops

## Budget Modes

| Mode | Calls | Cost | Use case |
|---|---|---|---|
| fast | 15 | $0.50 | LinkedIn post, short email |
| standard | 35 | $1.00 | Blog article |
| premium | 60 | $2.00 | Sales page, video script |

## Quality Score Weights

| Criterion | Weight |
|---|---|
| Clarity | 12% |
| Audience fit | 12% |
| Credibility | 12% |
| Utility | 12% |
| Human style | 10% |
| Brand voice | 10% |
| Conversion | 10% |
| Originality | 8% |
| Objective alignment | 8% |
| AI risk | 6% |

Thresholds: ≥8.0 → ACCEPTÉ | 6.0–7.9 → À CORRIGER | <6.0 → BLOQUÉ
