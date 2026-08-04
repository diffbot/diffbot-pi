---
name: diffbot-web-search
description: "Search the web using the Diffbot Web Search API. Use when the user wants to search the web, find recent news or pages, or get ranked web results with snippets. Triggers on: web search, search the web, diffbot search, search online, find web pages, web results."
---

# Diffbot Web Search

Search the web via `diffbot_web_search` (TypeScript SDK). Do not use the Python CLI.

## Tool

| Param | Default | Description |
|-------|---------|-------------|
| `query` | required | Search query text |
| `numResults` | API default | Number of results (1–50) |
| `maxTokens` | — | Cap total response tokens for agent context budgets |

## Workflow

```
diffbot_web_search({ query: "AI chip startups 2024" })
diffbot_web_search({ query: "diffbot knowledge graph", numResults: 5 })
diffbot_web_search({ query: "recent earnings Tesla", maxTokens: 2000 })
```

Present a numbered list with title, URL, score, and a short snippet when available.

## Result fields

| Field | Description |
|-------|-------------|
| `score` | Relevance (0–1); `>0.85` excellent, `0.7–0.85` good |
| `title` | Page title |
| `pageUrl` | URL |
| `date` | Publication date when available |
| `content` | Snippet / text |

## Tips

- Prefer this over DQL for very recent events.
- Keep `numResults` modest unless asked for more.
- Use `maxTokens` when the response might bloat context.
