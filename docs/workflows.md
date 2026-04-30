# Plume — Workflows

## Global Workflow (16 steps)

```
1.  Create project + choose budget mode
2.  Fill master brief
3.  EVV Brief (StrategistAgent → QualityAgent → ValidatorAgent)
4.  Generate plan (ArchitectAgent)
5.  EVV Plan
6.  Write section 1 (WriterAgent)
7.  EVV Section 1
8.  [...] Repeat per section
9.  Humanize (HumanizerAgent)
10. EVV Humanization
11. Apply brand voice (BrandVoiceAgent)
12. EVV Brand voice
13. Devil's advocate critique (CriticAgent)
14. EVV Critique
15. Final validation (QualityAgent → ValidatorAgent)
16. Export (ExportAgent)
```

## Workflow Config Object

```json
{
  "projectId": "uuid",
  "workflow": "article_blog",
  "mode": "standard",
  "steps": [
    "brief", "plan",
    "write_section", "humanize", "brand_voice",
    "critic", "quality", "validate", "export"
  ],
  "evv": true,
  "minimumScore": 8,
  "maxRetries": 2,
  "streaming": true
}
```

## SSE Event Types

| Event | Payload |
|---|---|
| step_started | { step: string } |
| token | { content: string } |
| step_completed | { step: string, duration_ms: number } |
| quality_score | { score: number, breakdown: object } |
| validation_decision | { decision: "ACCEPTÉ"\|"À CORRIGER"\|"BLOQUÉ" } |
| retry | { attempt: number, reason: string } |
| budget_warning | { remaining_usd: number, remaining_calls: number } |
| error | { message: string, code: string } |
| workflow_complete | { final_score: number } |

## Content Types (MVP v0.1)

- Article de blog
- Post LinkedIn
- Email professionnel
- Script vidéo
- Page de vente
- Chapitre de livre
