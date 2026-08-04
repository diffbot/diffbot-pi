---
name: diffbot-extract
description: "Extract markdown or structured content from a URL using the Diffbot Extract API. Use when the user wants to scrape, parse, fetch, or extract content from a webpage. Triggers on: extract URL, fetch page, parse webpage, get content from URL, extract article, extract structured data."
---

# Diffbot Extract

Extract structured content from any URL via `diffbot_extract` (TypeScript SDK). Do not use the Python CLI.

## Tool

| Param | Default | Description |
|-------|---------|-------------|
| `url` | required | Page URL |
| `api` | `analyze` | `analyze`, `article`, `product`, `image`, `video`, `discussion` |
| `format` | `markdown` | `markdown` (Title/URL/Content) or `json` (full API object) |

## Workflow

```
diffbot_extract({ url: "https://example.com/article" })
diffbot_extract({ url: "https://example.com/article", format: "json" })
diffbot_extract({ url: "https://example.com/product-page", api: "product" })
```

- **markdown**: relay Title / URL / Content.
- **json**: summarize key fields; avoid dumping huge payloads.

## Common JSON fields (`objects[0]`)

| Field | Description |
|-------|-------------|
| `title` | Page/article title |
| `text` | Plain text |
| `content` | Markdown content |
| `pageUrl` | Canonical URL |
| `date` | Publication date |
| `author` | Author |
| `tags` | Entity tags |
| `type` | Detected page type |

## Tips

- Prefer `format: "markdown"` unless you need specific JSON fields.
- On 4xx/5xx, try `api: "article"` as a fallback.
