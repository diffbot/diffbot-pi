---
name: diffbot-dql
description: "Runs a raw DQL (Diffbot Query Language) query against the Diffbot Knowledge Graph. The general-purpose layer beneath the entity-specific Diffbot skills: use it for entity types and query shapes they do not cover, such as products, patents, job posts, facet aggregations, cross-entity queries, an id filter from entity resolution, or ontology lookups. Triggers on: dql, query knowledge graph, search diffbot, diffbot kg, ontology lookup, facet query, entity types, raw dql."
---

# Diffbot Knowledge Graph Search (DQL)

Query the Diffbot Knowledge Graph via the Pi tools backed by `@diffbot/typescript`. Do
not use the Python CLI.

## Tools

| Tool | Purpose |
|------|---------|
| `diffbot_dql` | Run a DQL query / export |
| `diffbot_dql_probe` | Parallel hit counts (`size=0`) for query variants |
| `diffbot_ontology` | Browse types, fields, taxonomies, enums |

### `diffbot_dql` params

| Param | Default | Description |
|-------|---------|-------------|
| `query` | required | DQL string |
| `size` | `10` | Max results (`0` = hits only) |
| `from` | `0` | Pagination offset |
| `filter` | — | Semicolon-separated fields or JsonPath |
| `format` | `json` | `json`, `csv`, `xls`, `xlsx` |
| `exportspec` | — | CSV/XLS columns: `field,Header;field2,Header2` |

Auth is handled by the extension. Check with `/diffbot` if needed. Never echo the token.

## Workflow

### Step 1 — refresh ontology (once per session if needed)

```
diffbot_ontology({ action: "refresh" })
```

### Step 2 — construct and validate the DQL query

Examples:

```
type:Organization name:"Diffbot"
type:Product site:"ikea.com"
type:Organization location.city.name:"San Francisco" investments.investors.name:"Andreessen Horowitz"
type:Article categories.name:"War and Conflicts" tags.label:"Ethiopia" date>="2020-11-01" date<="2022-11-30" sortBy:date
```

Every DQL string starts with `type:`. Prefer common types (`Organization`, `Person`,
`Article`, `Product`), then look up others via ontology.

**Look up fields before using them.** An unknown field path is silently ignored (the
query runs as if the clause were absent) and a guessed value returns zero, so confirm both
with the ontology first. Issue multiple `diffbot_ontology` calls in parallel, in a single
message, so they don't queue:

```
diffbot_ontology({ action: "fields", name: "Organization", search: "location" })
diffbot_ontology({ action: "fields", name: "Location" })
diffbot_ontology({ action: "taxonomy", name: "OrganizationCategory", search: "semiconductor" })
diffbot_ontology({ action: "enum", name: "Language" })
diffbot_ontology({ action: "search", search: "asset" })
```

**Operators**

| Operator | Syntax | Example |
|----------|--------|---------|
| Contains | `field:"value"` | `name:"Diffbot"` |
| Regex | `re:field:"pattern"` | `re:name:"^Apple"` |
| Exact | `strict:field:"value"` | `strict:name:"Apple Inc"` |
| Comparisons | `field>N` / `<` / `!=` | `nbEmployees>500` |
| Max / Min | `max:field:N` / `min:field:N` | `max:capitalization.value:1000000` |
| Range | `range:field:N-M` | `range:nbEmployees:10-100` |
| OR | `or(v1,v2)` | `categories.name:or("Software companies","Hardware companies")` |
| NOT | `not(condition)` | `not(isPublic:true)` |
| Near | `near(...)` | `near(type:Place name:"San Francisco")` |
| Similar | `similarTo(...)` | `similarTo(name:"OpenAI")` |
| Has / get | `has:field` / `get:field` | `has:subsidiaries get:subsidiaries` |
| Get (exclude) | `get:!field` | `get:!nbEmployeesMax,!phoneNumbers` |
| Facet | `facet:field` | `facet:locations.city.name` |
| Facet with ranges | `facet[a:b,b:c]:field` | `facet[100:500,500:1000]:nbEmployees` |
| Facet with values | `facet["a","b"]:field` | `facet["Austin","Seattle"]:locations.city.name` |
| Sort | `sortBy:field` / `revSortBy:field` | `sortBy:date` |

**`field:"value"` is CONTAINS, not equals.** This is the root of most over-matching:
`name:"Apple"` returns 68,068 organizations, `strict:name:"Apple"` returns 1,426, and
`strict:name:"Apple Inc."` returns 1. Whenever the user names a specific entity, start
with `strict:`.

Two consequences worth internalizing:

- **`or()` is redundant when one string contains another.** `investment.series:"Series A"`
  already matches `"Series A-1"`, so `or("Series A","Series A-1")` returns an identical
  count.
- **`or()` is mandatory when the spellings genuinely differ.** An abbreviation is not a
  substring of its expansion: `employments.title:"Chief Executive Officer"` finds 521,798
  people, while `or("Chief Executive Officer","CEO")` finds 2,620,747.

**Regex is slow and compute-heavy.** Avoid it; if used, keep patterns short and simple.

**Do not add a sort unless the ordering is the question.** The default ranking already
encodes relevance and prominence, and an explicit sort overrides it, usually for the
worse. The exceptions are articles (`sortBy:date`) and deals (`revSortBy:investment.date`),
which `/skill:diffbot-news` and `/skill:diffbot-deals` apply by default.

**Subqueries** — co-constrain nested composites with `{}`:

```
type:Person employments.{employer.name:"Diffbot" isCurrent:true}
```

Without `{}` the two conditions are independent (a person with *any* Diffbot employment
AND *any* current employment — possibly different ones). Subqueries only work on
composite-typed list fields; check the ontology to confirm.

**Singular vs plural fields (primary vs all/historical)**

| Singular (primary) | Plural (all/historical) |
| ------------------ | ----------------------- |
| `location` | `locations` |
| `name` | `allNames` |
| `description` | `allDescriptions` |
| `homepageUri` | `allUris` |

Prefer the singular form when filtering on the *primary* fact — HQ vs any office.

**`similarTo`** (Organization only) returns a ranked list of exactly `size` results;
`hits` mirrors the requested size rather than a true match count. Other clauses compose
and narrow within the similarity search. **It cannot be validated with
`diffbot_dql_probe`** — probe runs at `size=0`, where `similarTo` always returns 0 —
validate with a small export (`size: 10`) instead.

**`near`** operates on a single anchor entity — if the subquery returns multiple, only
the first is used. Default radius 15km; specify with `mi` or `km`.

**The default JSON payload is not the full entity — `get:` also *adds* fields.** Many
filterable fields are simply absent from a plain export: `type:Organization
strict:name:"Tesla"` returns no `ceo` and no `founders` key at all; add
`get:name,ceo,founders` and both populate. The same is true of `Place.population` and
`Place.isPartOf`. So a missing or null field in a JSON export usually means you didn't
request it, not that the data is absent — **confirm with `has:<field>` before writing
"unpopulated" anywhere**. `exportspec` requests its CSV columns automatically, so only
raw JSON exports need `get:`.

**Article tips:** use `categories.name`, refine with `tags.label`, end with `sortBy:date`
unless asked otherwise. **Organization tips:** start with `categories.name`.

### Step 3 — probe variants before committing

```
diffbot_dql_probe({
  queries: [
    'type:Organization descriptors:"GPU" location.country.name:"United States"',
    'type:Organization descriptors:"GPU" location.country.name:"United States" categories.name:"Semiconductor Companies"',
  ]
})
```

The probe fires all variants in parallel and fails the whole batch if any single variant
is rejected by the API — fix the offending clause and re-run rather than assuming the
others were checked. Read the counts against the bare `type:X` count: a variant that
matches it exactly had a field path silently dropped, and zero means a wrong value. Never
probe an unfiltered `type:Article`.

### Step 4 — export and display

- Analysis / further tooling: `format: "json"` + tight `filter`
- User-facing table: `format: "csv"` + `exportspec`

```
diffbot_dql({
  query: 'type:Organization name:"Diffbot"',
  size: 10,
  filter: "name;summary;homepageUri;nbEmployees;location.city.name",
})

diffbot_dql({
  query: 'type:Organization categories.name:"Software companies"',
  size: 25,
  format: "csv",
  exportspec: "name,Name;nbEmployees,Employees;homepageUri,Website;location.city.name,City",
})
```

`exportspec` renders only the **primary** value of list/composite fields — one investor,
one location. Use JSON when full lists matter.

Always show the final DQL in a code block. For articles, prefer `summary` over raw
`text`/`content`.

## Performance discipline

- **One ontology lookup per message is wasteful.** Issue parallel `diffbot_ontology`
  tool calls in the same message — they execute concurrently.
- **Never serial-loop queries for hit counts.** Use `diffbot_dql_probe` for any
  N-variant check; it parallelizes internally.
- **Don't re-run `ontology refresh` mid-session.** The ontology is cached on disk
  (`~/.diffbot/ontology.json`) and in-process; refresh once at the start.
