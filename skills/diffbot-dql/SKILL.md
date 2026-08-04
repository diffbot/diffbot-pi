---
name: diffbot-dql
description: "Query the Diffbot Knowledge Graph using DQL (Diffbot Query Language). Use when the user wants to search for organizations, people, or articles in the Diffbot KG. Triggers on: search diffbot, query knowledge graph, dql search, find companies, find news articles, find people, latest news"
---

# Diffbot Knowledge Graph Search (DQL)

Query the Diffbot Knowledge Graph via the Pi tools backed by `@diffbot/typescript`. Do not use the Python CLI.

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

Every DQL string starts with `type:`. Prefer common types (`Organization`, `Person`, `Article`, `Product`), then look up others via ontology.

**Look up fields before using them:**

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
| Range | `range:field:N-M` | `range:nbEmployees:10-100` |
| OR | `or(v1,v2)` | `categories.name:or("Software companies","Hardware companies")` |
| NOT | `not(condition)` | `not(isPublic:true)` |
| Near | `near(...)` | `near(type:Place name:"San Francisco")` |
| Similar | `similarTo(...)` | `similarTo(name:"OpenAI")` |
| Has / get | `has:field` / `get:field` | `has:subsidiaries get:subsidiaries` |
| Facet | `facet:field` | `facet:locations.city.name` |
| Sort | `sortBy:field` / `revSortBy:field` | `sortBy:date` |

**Subqueries** — co-constrain nested composites with `{}`:

```
type:Person employments.{employer.name:"Diffbot" isCurrent:true}
```

Prefer singular primary fields (`location`) over plurals (`locations`) when filtering on the primary fact.

**Article tips:** use `categories.name`, refine with `tags.label`, end with `sortBy:date` unless asked otherwise.  
**Organization tips:** start with `categories.name`.

### Step 3 — probe variants before committing

```
diffbot_dql_probe({
  queries: [
    'type:Organization descriptors:"GPU" location.country.name:"United States"',
    'type:Organization descriptors:"GPU" location.country.name:"United States" categories.name:"Semiconductor Companies"',
  ]
})
```

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

Always show the final DQL in a code block. For articles, prefer `summary` over raw `text`/`content`.
