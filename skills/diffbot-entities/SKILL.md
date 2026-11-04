---
name: diffbot-entities
description: "Named entity recognition and linking with the Diffbot NLP API. Finds people, organizations, places, and products mentioned in text. Each resolves to a Diffbot Knowledge Graph entity with confidence, salience, and sentiment. Prefer for post-processing plain text for entity mentions. `format: dql` emits an id:or(...) filter that fetches the full records; entities without an id were recognized but not matched. Triggers on: identify entities, entity recognition, NER, find entities in text, extract entities, entity linking, diffbot NLP, named entity."
---

# Diffbot Entities (NLP)

Identify and resolve named entities via `diffbot_entities` (TypeScript SDK). Do not use the Python CLI.

## Tool

| Param | Default | Description |
|-------|---------|-------------|
| `text` | required | Plain text to analyze |
| `lang` | `auto` | Language code or `auto` |
| `format` | `json` | `json` (raw API) or `dql` (`id:or(...)` filter) |

## Workflow

```
diffbot_entities({ text: "Apple CEO Tim Cook announced record quarterly earnings." })
diffbot_entities({ text: "...", lang: "es" })
```

Bridge free text to KG lookups with `format: "dql"`:

```
diffbot_entities({ text: "Apple, Microsoft, and Google dominate cloud AI.", format: "dql" })
# → id:or("EiqAqBMJHMT","EL7WL3J","EiCxSaRJP")

diffbot_dql({
  query: 'id:or("EiqAqBMJHMT","EL7WL3J","EiCxSaRJP")',
  filter: "name;nbEmployees;homepageUri",
})
```

## Output fields (json)

| Field | Description |
|-------|-------------|
| mention / name | Text as it appears |
| Type | Organization, Person, Place, etc. |
| Confidence | Resolution accuracy |
| Salience | Prominence in the text |
| Sentiment | Per-entity sentiment |
| Diffbot ID | For `id:` DQL lookups |

## Tips

- Confidence = right KG record?; salience = how central to the text?
- Prefer entities → DQL-by-id over guessing names in DQL when starting from free text.
- Document-level sentiment is returned above the entity list when present — per-entity
  sentiment is the `sentiment` field on each entity.
- Entities without a Diffbot ID were recognized but not linked to the KG (proper noun
  detection without a record match) — they cannot be used in `id:` lookups.
