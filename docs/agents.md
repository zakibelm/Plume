# Plume — Agents

## Agent Inventory

| Agent | Role | Input | Output |
|---|---|---|---|
| StrategistAgent | Clarifies mission/objective/audience | Raw brief | Structured brief JSON |
| ArchitectAgent | Builds editorial plan | Validated brief | H1/H2/H3 plan JSON |
| WriterAgent | Writes section by section | Plan + context + section | Section text |
| HumanizerAgent | Makes text natural | Raw text | Humanized text |
| BrandVoiceAgent | Applies brand voice | Text + voice profile | Aligned text |
| EnhancerAgent | Adds examples, proof, depth | Text | Enriched text |
| CriticAgent | Devil's advocate | Text + brief | Structured critique JSON |
| QualityAgent | Scores + checks | Text + rules | Detailed score JSON |
| ValidatorAgent | EVV decision | Quality score | Decision + feedback JSON |
| ExportAgent | Formats final output | Validated text | MD / HTML |

## Model Assignment

| Role | Primary | Fallback |
|---|---|---|
| WriterAgent | anthropic/claude-3.5-sonnet | mistralai/mistral-large |
| QualityAgent | google/gemini-flash-1.5 | meta-llama/llama-3.1-70b |
| ValidatorAgent | google/gemini-flash-1.5 | meta-llama/llama-3.1-8b |
| HumanizerAgent | mistralai/mistral-large | qwen/qwen-2.5-72b |
| CriticAgent | anthropic/claude-3.5-sonnet | mistralai/mistral-large |

## Error Strategies

| Error | Strategy |
|---|---|
| Timeout | Retry once with same model |
| Model error | Switch to fallback model |
| Budget exceeded | Clean stop |
| Validation failed | Human review flag |

## Context Format

Each agent receives a compact context (< 2000 tokens):

```json
{
  "mission": "...",
  "audience": "...",
  "angle": "...",
  "brand_voice": "...",
  "current_section": "...",
  "previous_sections_summary": "...",
  "constraints": ["..."]
}
```
