# @diffbot/pi

[Pi](https://pi.dev) package that adds Diffbot tools to the coding agent — Knowledge Graph (DQL), Extract, Web Search, Entities, Crawl, Ask, and Ontology.

All runtime calls go through [`@diffbot/typescript`](https://www.npmjs.com/package/@diffbot/typescript). This package does not use the Python SDK or CLI.

## Install

```bash
# from npm
pi install npm:@diffbot/pi

# from git
pi install git:github.com/diffbot/diffbot-pi

# from a local checkout
pi install .
```

Try without installing:

```bash
pi -e .
```

If you also have [`diffbot-skills`](https://github.com/diffbot/diffbot-skills) discoverable in Pi, disable those skills (or remove them from settings). Skill names collide on purpose; package skills have lower precedence than user/auto skills, so the Python-oriented ones would win otherwise.

## Auth

Token resolution (same as [`@diffbot/typescript`](https://www.npmjs.com/package/@diffbot/typescript)):

1. `DIFFBOT_API_TOKEN` environment variable
2. `DIFFBOT_API_TOKEN=...` in `~/.diffbot/credentials`

Check status in Pi with `/diffbot`.

## Tools

| Tool | Purpose |
|------|---------|
| `diffbot_dql` | Query / export KG with DQL (`filter`, `format`, `exportspec`) |
| `diffbot_dql_probe` | Parallel hit counts for query variants |
| `diffbot_ontology` | Browse / refresh KG ontology |
| `diffbot_extract` | Extract structured content from a URL |
| `diffbot_web_search` | Search Diffbot's web index (`maxTokens`) |
| `diffbot_entities` | Named entities + sentiment (`format: dql` helper) |
| `diffbot_ask` | Diffbot LLM ask / short chat |
| `diffbot_crawl` | Start a Crawlbot job (optional watch) |
| `diffbot_crawl_jobs` | List or inspect crawler jobs |
| `diffbot_crawl_delete` | Delete a crawler job |

## Skills

Workflow guidance for those tools (parity with [`diffbot-skills`](https://github.com/diffbot/diffbot-skills), but invoking TS-backed Pi tools). Invoke with `/skill:name`:

| Skill | Command |
|-------|---------|
| DQL / Knowledge Graph | `/skill:diffbot-dql` |
| Extract | `/skill:diffbot-extract` |
| Web Search | `/skill:diffbot-web-search` |
| Entities (NLP) | `/skill:diffbot-entities` |
| Crawl | `/skill:diffbot-crawl` |
| Ask | `/skill:diffbot-ask` |

## Develop

```bash
git clone https://github.com/diffbot/diffbot-pi.git
cd diffbot-pi
npm install
npm run typecheck

# load from this directory
pi -e .
# or install into user settings
pi install .
```

Depends on [`@diffbot/typescript`](https://www.npmjs.com/package/@diffbot/typescript) from npm.

## Package layout

Follows the [Pi package](https://pi.dev/docs/latest/packages#creating-a-pi-package) conventions:

```
diffbot-pi/
├── extensions/     # TypeScript extensions (tools + /diffbot)
├── skills/         # Agent Skills (SKILL.md workflows)
├── package.json    # pi manifest + pi-package keyword
└── README.md
```

## License

MIT
