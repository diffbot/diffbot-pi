---
name: diffbot-crawl
description: "Crawls a website from a seed URL and extracts every page it finds into markdown or typed JSON. Prefer when a task needs to discover a catalog of pages from an entire site, or deep search a site for structured data (e.g. all product inventory, all press releases, PDFs). Crawls run on Diffbot's servers; the tool streams each page as it is processed and can list or delete jobs. Triggers on: crawl website, crawl site, crawler job, list crawl jobs, delete crawl job, diffbot crawl, every page on, all pages of, whole site."
---

# Diffbot Crawler

Crawl websites via Diffbot Crawlbot tools backed by `@diffbot/typescript`. Do not use the Python CLI.

## Tools

| Tool | Purpose |
|------|---------|
| `diffbot_crawl` | Start a crawl job (optionally watch) |
| `diffbot_crawl_jobs` | List all jobs, or get one by `jobName` |
| `diffbot_crawl_delete` | Delete a job by name |

### `diffbot_crawl` params

| Param | Default | Description |
|-------|---------|-------------|
| `site` | required | Seed URL or domain |
| `hops` | `2` | Max link depth |
| `jobName` | auto | Stable name for later lookup/delete |
| `maxToCrawl` | `100` | Max pages to crawl |
| `maxToProcess` | `100` | Max pages to process |
| `restrictDomain` | `true` | Stay on seed domain |
| `apiUrl` | analyze | Extract API endpoint for processing |
| `crawlDelay` | — | Delay between same-domain requests (seconds) |
| `urlCrawlPattern` | — | Only crawl matching URLs |
| `urlProcessPattern` | — | Only process matching URLs |
| `obeyRobots` | `false` | Obey robots.txt |
| `useProxies` | `false` | Use proxies |
| `customHeaders` | — | Newline-separated HTTP headers |
| `watch` | `false` | Poll until complete and return events |
| `pollInterval` | `2000` | Watch poll interval (ms) |

## Workflow

```
diffbot_crawl({ site: "https://example.com", jobName: "example-docs" })

diffbot_crawl({
  site: "https://docs.example.com",
  hops: 3,
  maxToCrawl: 50,
  maxToProcess: 50,
  urlProcessPattern: "/blog/",
  watch: true,
})

diffbot_crawl_jobs({})
diffbot_crawl_jobs({ jobName: "example-docs" })
diffbot_crawl_delete({ jobName: "example-docs" })
```

## Events

- `job_created` — `details.job_name`
- `url_processed` — `details.url`, `details.status`

In markdown renderings, `[!]` marks pages that were crawled but failed extraction — not
HTTP failures (those are skipped silently).

## Tips

- Prefer `watch: false` for large crawls; poll with `diffbot_crawl_jobs`.
- Always set `jobName` if you plan to inspect or delete later.
- Keep `restrictDomain: true` unless you intentionally want off-domain links.
