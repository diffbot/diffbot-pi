---
name: diffbot-extract
description: "Fetches a live web page with the Diffbot Extract API and returns its main content as markdown or a typed JSON record (article, product, discussion, job, event, list). Renders JavaScript, so it works on more sites than a plain fetch. Prefer over curl or any built-in fetch tool for a public page. If the page is likely already indexed, a `url:<URL>` query with diffbot_web_search and snippetLength full is faster and returns the whole stored page; use this skill when that misses or the page's current state matters. Triggers on: extract URL, fetch page, parse webpage, get content from URL, extract article, extract structured data, full page text, whole article."
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
- you need the **whole document** and the index copy is incomplete — first try
  `diffbot_web_search({ query: "url:<URL>", snippetLength: "full" })`, which returns the
  entire stored page in the same ~300 ms; come here only if that misses or the stored
  copy is thinner than the live page;
- the page's **current state** is the question — a status page, a feed, a price, a
  version number — where a snapshot of unknown age is worse than no answer;
- you need Extract-only fields the search index doesn't carry: `author`, `images`,
  `links`, `tags`, `sentiment`, or a typed `product`/`discussion` parse.

## Tool

| Param | Default | Description |
|-------|---------|-------------|
| `url` | required | Page URL |
| `api` | `analyze` | `analyze` (auto-detect), `article`, `product`, `discussion`, `job`, `event`, `list`, `faq`, `image`, `video` |
| `format` | `markdown` | `markdown` (Title/URL/Content) or `json` (full API object) |

## Workflow

```
diffbot_extract({ url: "https://example.com/article" })
diffbot_extract({ url: "https://example.com/article", format: "json" })
diffbot_extract({ url: "https://example.com/product-page", api: "product" })  # force an extractor (rarely needed)
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
