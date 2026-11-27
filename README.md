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

Token resolution (via `resolveToken` from [`@diffbot/typescript/node`](https://www.npmjs.com/package/@diffbot/typescript)):

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
| Organizations (companies) | `/skill:diffbot-organizations` |
| People | `/skill:diffbot-people` |
| Places (geography) | `/skill:diffbot-places` |
| Deals (funding / M&A) | `/skill:diffbot-deals` |
| News & articles | `/skill:diffbot-news` |
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

0.4.0 depends on [`@diffbot/typescript`](https://www.npmjs.com/package/@diffbot/typescript) ^0.6.0. DQL goes through the SDK `dql()` helper, which posts a JSON body; the token stays a query parameter. `package-lock.json` still records the published 0.3.0 tarball — run `npm update @diffbot/typescript` once 0.6.0 is on npm. A missing crawl job from `crawlGetJob()` is `undefined`.

## Release

Publishing uses npm trusted publishing from `.github/workflows/release.yml` (no npm token). The workflow follows the shared npm release workflow standard for the Diffbot TypeScript packages (`docs/conventions/npm-release-workflow.md` in diffbot-dev-docs).

1. On a branch, bump `version` in `package.json` (and update `package-lock.json`) and add a `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md`.
2. Merge to `main`.
3. Tag the merge commit and push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.

The workflow checks that the tag matches `package.json` and that `CHANGELOG.md` has a section for the version, runs `npm ci`, `npm run typecheck` and `npm pack` (there is no build, lint or test step), then runs `npm publish --access public --provenance` (skipped if that version is already on npm) and creates the GitHub Release with that CHANGELOG section as its notes.

For a release candidate, use a version such as `0.5.0-rc.0` and tag `v0.5.0-rc.0`. Its CHANGELOG section may be the base `## [0.5.0]` one. Any version containing `-` is published under the npm `next` dist-tag (`latest` is untouched), and its GitHub Release is marked as a prerelease. A final version is published as `latest` and then also moves `next`.

Running the workflow manually (`workflow_dispatch`, action `dry-run`) runs the same checks and a publish rehearsal (`npm publish --dry-run`, or `npm pack` if the version is already on npm), and publishes nothing. Action `move-next` only re-points `next` at an already-published version.

One-time npm setup (package settings → Trusted publisher): org `diffbot`, repo `diffbot-pi`, workflow `release.yml`, no environment.

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
