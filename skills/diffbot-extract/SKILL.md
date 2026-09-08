---
name: diffbot-extract
description: "Extract markdown or structured content from a URL using the Diffbot Extract API — a live fetch and parse of the page, seconds per call. Try diffbot_web_search with `url:<URL>` first: it reads Diffbot's already-extracted copy from the Web Index in ~300ms and answers most page questions outright. Use this skill when that lookup misses (URL not indexed), or when you need the complete document rather than the relevant chunks. Triggers on: extract URL, fetch page, parse webpage, get content from URL, extract article, extract structured data, full page text, whole article."
---

# Diffbot Extract

Extract structured content from any URL via `diffbot_extract` (TypeScript SDK). Returns a
clean markdown rendering of the page by default.

## First: is a live fetch actually needed?

Extract is a **live retrieval** — it fetches and parses the page on demand (typically
seconds per call). Diffbot has usually already parsed the page, and that copy is one
index lookup away:

```
diffbot_web_search({ query: "url:<URL> <what you want to know>" })
```

~300 ms, one record back, and the chunks matching your terms — see
`/skill:diffbot-web-search`, which also covers when a cached copy is *not* safe to trust.
Run it first for any public URL, the same way you would before reaching for `curl`. Come
back here when:

- the lookup came back **empty** — the URL isn't indexed (too new, paywalled, private,
  behind a login), so live retrieval is the only option;
- you need the **whole document**, not the ~4–6 KB of chunks the index lookup returns —
  every row of a table, a full changelog, an entire spec, license, or transcript;
- the page's **current state** is the question — a status page, a feed, a price, a
  version number — where a snapshot of unknown age is worse than no answer;
- you need Extract-only fields the search index doesn't carry: `author`, `images`,
  `links`, `tags`, `sentiment`, or a typed `product`/`discussion` parse.

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

Before extracting a batch of URLs, run a `url:` lookup per URL first — ~300 ms each, and
it usually removes the need to extract most of them.

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
| `images` / `links` | Extracted media and outbound links |
| `type` | Detected page type |

## Tips

- Prefer `format: "markdown"` unless you need specific JSON fields.
- On 4xx/5xx, try `api: "article"` as a fallback — the page may be behind auth,
  Cloudflare, or a JS SPA.
