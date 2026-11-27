# Changelog

## [0.4.0] - 2026-11-17

### Changed

- Depends on `@diffbot/typescript` `^0.6.0` (cumulative 0.4.0–0.6.0). DQL goes through the SDK `dql()` helper, which POSTs a JSON body; the token stays the query parameter.
- `dql()` format is the SDK `ExportFormat`. Chat messages are checked against `system`, `user`, and `assistant`.
- A missing crawl job (`crawlGetJob()` returning `undefined`) is reported as an error.

`package-lock.json` still records the published 0.3.0 tarball. Run `npm update @diffbot/typescript` once 0.6.0 is on npm, then tag `v0.4.0`. Publishing is npm trusted publishing from `.github/workflows/release.yml` (no token, no GitHub environment).
