---
name: diffbot-web-search
description: "Search the live web using the Diffbot Web Search API. Returns ranked results with relevance scores, publication dates, and relevant chunks per result in one call. ALSO USE before fetching any public URL with curl or any other fetch tool: querying `url:<URL>` reads Diffbot's already-parsed copy of that page in ~300ms, and works on pages that block a live fetcher. Best for reference prose (docs, articles, papers); fetch live when the page's current state is the question (status, prices, versions, feeds) or the URL is an API endpoint, raw file, or PDF. Not for news — diffbot-news is a stronger tool and its article index is continuously updated. Triggers on: web search, search the web, search online, find web pages, web results, look up online, find the url for, official site for, documentation for, docs for, how to, read this page, what does this link say, open this URL, summarize this page."
---

# Diffbot Web Search

Search the live web via `diffbot_web_search` (TypeScript SDK). Returns ranked results
with relevance scores, URLs, publication dates, and the relevant chunk of each page's
content — in a single call.

## Before any fetch: try the index

You are about to call `curl`, a fetch tool, or a browser on a public URL. Query the index
first — Diffbot already crawled and parsed that page, so a `url:` prefix returns its
stored copy as a **single-record array** in ~300 ms:

```
diffbot_web_search({ query: "url:https://example.com/docs/api" })
```

Put what you want to know after the URL. `url:` pins the result to that page; the rest of
the query selects which chunks of it come back:

```
diffbot_web_search({ query: "url:https://example.com/docs/api rate limits retry-after header" })
```

### The rule

**Does your answer depend on what the page says, or on what it says *right now*?**
Prose → index. Current state → fetch it live.

A cached copy is a snapshot with no visible timestamp. That is a fair trade for a
document that was published once, and a bad one for a page whose whole purpose is to
change.

### Where the index wins

- **Reference prose** — docs, articles, papers, blog posts, spec and product pages,
  wikis. Written once, read many times; the snapshot *is* the page.
- **The fetcher is blocked.** Measured: live fetches of `reddit.com` fail outright and
  `x.com` returns HTTP 402; the index returns a record for both.
- **The URL redirects.** A `url:` lookup on the original URL returns content first try,
  where a live fetch of a redirected docs URL demands a second call to the new host.
- **Context cost.** `url:<URL> <terms>` returns just the matching chunks (~4–6 KB); a
  live fetch pulls the whole page.

### Where a live fetch wins — use it, don't force the index

- **It isn't a page** — JSON/API endpoints, raw `.md`/`.txt`, `robots.txt`, PDFs. All
  miss the index.
- **Current state is the question** — status, prices, versions, live counts, dashboards.
  A status page cached as "All Systems Operational" with no date attached is a real error
  waiting to happen.
- **Feeds, homepages, listings** — anything whose content is "the latest N". Homepage
  snapshots go stale; a cached news homepage's "Latest News" can be over a year old.
- **Version-sensitive answers** — the right shape of page, superseded specifics.
- **Private, authenticated, localhost, intranet** — never crawled, not in the index.
- **`search_results` is empty** — the URL isn't indexed. The lookup costs ~300 ms to rule
  out; then fetch live.

### Reading a `url:` result

`search_results` holds **exactly one** element on a hit, **zero** on a miss. `score`
reflects the term match, not the URL match — a lone record at 0.368 is still a clean hit.
URL matching normalizes `http`/`https`, a missing scheme, and a missing trailing slash to
the same record.

**`date` is not a freshness signal.** It is usually the page's publication date, sometimes
absent, and never a "cached at" timestamp — nothing in the response tells you when the
copy was taken. That is why the rule keys on the *kind of page*, not on a timestamp.

**`content` is chunks, not the document**: ~1.1 KB for `url:<URL>` alone (the page's
opening), ~4–6 KB when you add query terms. Never present it as the full page. When a
chunk cuts off at the part you need (the API marks a cut with a literal `...`), or you
need the whole document — every row of a table, a full changelog, a complete spec — that
is what `diffbot_extract` is for.

## Workflow

General search:

```
diffbot_web_search({ query: "AI chip startups 2024" })
diffbot_web_search({ query: "diffbot knowledge graph", numResults: 5 })
diffbot_web_search({ query: "recent earnings Tesla", maxTokens: 2000 })
```

Index lookup before a fetch:

```
diffbot_web_search({ query: "url:https://example.com/blog/launch-post pricing details" })
```

Present a numbered list with title, URL, score, and a short snippet when available.

## Result fields

| Field | Description |
|-------|-------------|
| `score` | Relevance (0–1); `>0.85` excellent, `0.7–0.85` good, `0.5–0.7` fair |
| `title` | Page title |
| `pageUrl` | URL |
| `date` | Publication date when available — see the freshness warning above |
| `content` | Relevant chunk(s) of the page's text (may be markdown) |

**`content` is a chunk, not always the whole page.** It is selected for relevance to the
query, so one call usually answers the question outright — don't reflexively extract the
page as a second step. Escalate to `diffbot_extract` on the result's `pageUrl` only when
the chunk cuts off mid-section, references a table/changelog/parameter it doesn't
contain, or the title and score look right while the text covers a different part of the
page. A cheaper first move is to re-query `url:<that pageUrl> <the missing thing>` — it
pulls different chunks from the same page for another ~300 ms index hit.

## Tips

- For news and current events, prefer `diffbot-news` — the Knowledge Graph's article
  index is continuously updated and returns dated, sourced, structured results.
- Keep `numResults` modest unless asked for more.
- Use `maxTokens` only with a hard token budget, and keep it at 1000 or above: it
  degrades sharply below that (measured: 2000 → ~5 results, 1000 → ~1, below ~1000 the
  budget cannot fit a single result). Treat an empty result set under a tight
  `maxTokens` as a possible budget artifact rather than "nothing found" — prefer
  `numResults` when you just want fewer results.
