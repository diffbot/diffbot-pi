import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  DiffbotClient,
  DiffbotError,
  Ontology,
  ask,
  crawl,
  crawlDeleteJob,
  crawlGetJob,
  crawlListJobs,
  dql,
  dqlParallel,
  entities,
  extract,
  webSearch,
  type JsonObject,
} from "@diffbot/typescript";
import { FileOntologyStore, resolveToken } from "@diffbot/typescript/node";
import { homedir } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";

type ToolDetails = { error?: string };

const ONTOLOGY_PATH = join(homedir(), ".diffbot", "ontology.json");

function getClient(): DiffbotClient {
  const token = resolveToken();
  if (!token) {
    throw new Error(
      "Diffbot API token not found. Set DIFFBOT_API_TOKEN or add DIFFBOT_API_TOKEN=... to ~/.diffbot/credentials",
    );
  }
  return new DiffbotClient({ token });
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function errorText(err: unknown): string {
  if (err instanceof DiffbotError || err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function ok(text: string): { content: [{ type: "text"; text: string }]; details: ToolDetails } {
  return {
    content: [{ type: "text", text }],
    details: {},
  };
}

function fail(
  label: string,
  err: unknown,
): { content: [{ type: "text"; text: string }]; details: ToolDetails; isError: true } {
  const message = errorText(err);
  return {
    content: [{ type: "text", text: `${label} failed: ${message}` }],
    details: { error: message },
    isError: true,
  };
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function formatExtractMarkdown(data: JsonObject): string {
  const objects = data.objects;
  if (!Array.isArray(objects) || objects.length === 0) {
    return formatJson(data);
  }
  const obj = asObject(objects[0]);
  const title = String(obj.title ?? "");
  const url = String(obj.pageUrl ?? "");
  const content = String(obj.content ?? "");
  return `Title: ${title}\n\nURL: ${url}\n\nContent: ${content}`;
}

function entityId(entity: JsonObject): string {
  const raw = String(entity.id ?? entity.diffbotUri ?? "");
  if (!raw) return "";
  return raw.replace(/\/+$/, "").split("/").pop() ?? "";
}

function formatEntitiesDql(data: JsonObject): string {
  const ents = Array.isArray(data.entities) ? data.entities : [];
  const ids: string[] = [];
  for (const entry of ents) {
    const id = entityId(asObject(entry));
    if (id) ids.push(id);
  }
  if (!ids.length) return "";
  return `id:or(${ids.map((id) => `"${id}"`).join(",")})`;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("diffbot", {
    description: "Show Diffbot auth status",
    handler: async (_args, ctx) => {
      const token = resolveToken();
      if (!token) {
        ctx.ui.notify(
          "No token. Set DIFFBOT_API_TOKEN or ~/.diffbot/credentials",
          "error",
        );
        return;
      }
      ctx.ui.notify(`Diffbot token configured (${token.slice(0, 4)}…)`, "info");
    },
  });

  pi.registerTool({
    name: "diffbot_dql",
    label: "Diffbot DQL",
    description:
      "Query Diffbot Knowledge Graph with DQL (Diffbot Query Language). Use for structured entity lookup: organizations, people, articles, products, and more. " +
      "Entity records can be very large. Prefer `filter` (semicolon-separated fields) or `format`/`exportspec` for CSV exports. " +
      "Use diffbot_dql_probe for hit-count checks and diffbot_ontology to look up fields before querying.",
    parameters: Type.Object({
      query: Type.String({
        description: 'DQL query, e.g. type:Organization name:"Diffbot"',
      }),
      size: Type.Optional(
        Type.Number({
          description: "Max results (default 10). Use 0 for hit counts only.",
          minimum: 0,
          maximum: 100,
        }),
      ),
      from: Type.Optional(
        Type.Number({ description: "Result offset for pagination", minimum: 0 }),
      ),
      filter: Type.Optional(
        Type.String({
          description:
            'Semicolon-separated fields (e.g. "name;summary;homepageUri") or JsonPath to restrict returned fields.',
        }),
      ),
      format: Type.Optional(
        Type.String({
          description: "Response format: json (default), csv, xls, or xlsx",
        }),
      ),
      exportspec: Type.Optional(
        Type.String({
          description:
            'CSV/XLS column spec: "field,Header;field2,Header2" (used with format csv/xls/xlsx)',
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        const format = params.format ?? "json";
        const data = await dql(db, params.query, {
          size: params.size,
          from: params.from,
          filter: params.filter,
          format,
          exportspec: params.exportspec,
          raw: format !== "json",
        });
        await db.close();
        if (data instanceof Uint8Array) {
          return ok(new TextDecoder().decode(data));
        }
        return ok(formatJson(data));
      } catch (err) {
        return fail("diffbot_dql", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_dql_probe",
    label: "Diffbot DQL Probe",
    description:
      "Run multiple DQL queries in parallel with size=0 and return hit counts. Use to compare query selectivity before a full export.",
    parameters: Type.Object({
      queries: Type.Array(Type.String({ description: "DQL query" }), {
        description: "Candidate DQL queries to probe",
        minItems: 1,
      }),
      workers: Type.Optional(
        Type.Number({ description: "Max concurrent requests (default 8)", minimum: 1, maximum: 32 }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        const results = await dqlParallel(
          db,
          params.queries.map((query) => ({ query, size: 0 })),
          params.workers ?? 8,
        );
        await db.close();
        const rows = params.queries.map((query, i) => {
          const row = asObject(results[i]);
          return {
            query,
            hits: row.hits ?? null,
            results: row.results ?? null,
          };
        });
        return ok(formatJson(rows));
      } catch (err) {
        return fail("diffbot_dql_probe", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_ontology",
    label: "Diffbot Ontology",
    description:
      "Browse the Diffbot Knowledge Graph ontology (types, fields, taxonomies, enums). " +
      "Use before crafting DQL to verify field names. action=refresh downloads/refreshes the local cache (~/.diffbot/ontology.json).",
    parameters: Type.Object({
      action: Type.String({
        description:
          "types | composites | enums | taxonomies | fields | taxonomy | enum | search | refresh",
      }),
      name: Type.Optional(
        Type.String({
          description: "Type/composite/taxonomy/enum name (required for fields, taxonomy, enum)",
        }),
      ),
      search: Type.Optional(
        Type.String({
          description: "Optional regex filter for fields/taxonomy/search",
        }),
      ),
      includeDeprecated: Type.Optional(
        Type.Boolean({ description: "Include deprecated fields (fields action only)" }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        const store = new FileOntologyStore(db, ONTOLOGY_PATH);
        const action = params.action.trim().toLowerCase();

        if (action === "refresh") {
          await store.load({ refresh: true });
          await db.close();
          return ok(formatJson({ refreshed: ONTOLOGY_PATH }));
        }

        const ont = await store.load();
        await db.close();

        switch (action) {
          case "types":
            return ok(formatJson(ont.types()));
          case "composites":
            return ok(formatJson(ont.composites()));
          case "enums":
            return ok(formatJson(ont.enums()));
          case "taxonomies":
            return ok(formatJson(ont.taxonomies()));
          case "fields": {
            if (!params.name) throw new Error("name is required for action=fields");
            const fields = ont.fieldsFor(params.name);
            const filtered = Ontology.filterFields(
              fields,
              params.search,
              params.includeDeprecated ?? false,
            );
            return ok(
              filtered.map(([name, meta]) => Ontology.formatField(name, meta)).join("\n"),
            );
          }
          case "taxonomy": {
            if (!params.name) throw new Error("name is required for action=taxonomy");
            return ok(formatJson(ont.taxonomyValues(params.name, params.search)));
          }
          case "enum": {
            if (!params.name) throw new Error("name is required for action=enum");
            return ok(formatJson(ont.enumValues(params.name)));
          }
          case "search": {
            if (!params.search) throw new Error("search is required for action=search");
            return ok(formatJson(ont.findNamed(params.search)));
          }
          default:
            throw new Error(
              `Unknown action "${params.action}". Use types|composites|enums|taxonomies|fields|taxonomy|enum|search|refresh`,
            );
        }
      } catch (err) {
        return fail("diffbot_ontology", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_extract",
    label: "Diffbot Extract",
    description:
      "Extract structured content from a URL via Diffbot Extract. Prefer this over raw HTML fetching when you need clean article/product/page structure.",
    parameters: Type.Object({
      url: Type.String({ description: "Page URL to extract" }),
      api: Type.Optional(
        Type.String({
          description:
            "Extractor: analyze (auto), article, product, image, video, discussion (default analyze)",
        }),
      ),
      format: Type.Optional(
        Type.String({
          description: "Response shaping: markdown (default Title/URL/Content) or json",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        const format = params.format ?? "markdown";
        const data = await extract(db, params.url, params.api ?? "analyze", format);
        await db.close();
        if (format === "markdown") {
          return ok(formatExtractMarkdown(data));
        }
        return ok(formatJson(data));
      } catch (err) {
        return fail("diffbot_extract", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_web_search",
    label: "Diffbot Web Search",
    description:
      "Search the web with Diffbot Web Search. Returns ranked pages with titles and URLs from Diffbot's index.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query text" }),
      numResults: Type.Optional(
        Type.Number({ description: "Number of results", minimum: 1, maximum: 50 }),
      ),
      maxTokens: Type.Optional(
        Type.Number({
          description: "Cap total response tokens (useful for agent context budgets)",
          minimum: 1,
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        const data = await webSearch(db, params.query, {
          numResults: params.numResults,
          maxTokens: params.maxTokens,
        });
        await db.close();
        return ok(formatJson(data));
      } catch (err) {
        return fail("diffbot_web_search", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_entities",
    label: "Diffbot Entities",
    description:
      "Extract named entities and sentiment from plain text using Diffbot NLP. " +
      'Use format="dql" to get an id:or(...) filter for diffbot_dql.',
    parameters: Type.Object({
      text: Type.String({ description: "Plain text to analyze" }),
      lang: Type.Optional(
        Type.String({ description: "Language code or auto (default auto)" }),
      ),
      format: Type.Optional(
        Type.String({
          description: "json (default raw API) or dql (id:or(...) filter string)",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        const data = await entities(db, params.text, params.lang ?? "auto");
        await db.close();
        if ((params.format ?? "json") === "dql") {
          return ok(formatEntitiesDql(data));
        }
        return ok(formatJson(data));
      } catch (err) {
        return fail("diffbot_entities", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_ask",
    label: "Diffbot Ask",
    description:
      "Ask Diffbot LLM a question (or continue a short chat). Streams and returns the full answer text.",
    parameters: Type.Object({
      prompt: Type.Optional(
        Type.String({ description: "User prompt (simple one-shot ask)" }),
      ),
      messages: Type.Optional(
        Type.Array(
          Type.Object({
            role: Type.String({ description: "Message role: user, assistant, or system" }),
            content: Type.String({ description: "Message content" }),
          }),
          { description: "Chat messages (alternative to prompt)" },
        ),
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      try {
        const messages =
          params.messages && params.messages.length > 0
            ? params.messages
            : params.prompt
              ? [{ role: "user", content: params.prompt }]
              : null;
        if (!messages) {
          throw new Error("Provide prompt or messages");
        }
        const db = getClient();
        let text = "";
        for await (const chunk of ask(db, messages)) {
          if (signal?.aborted) break;
          text += chunk;
        }
        await db.close();
        return ok(text);
      } catch (err) {
        return fail("diffbot_ask", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_crawl",
    label: "Diffbot Crawl",
    description:
      "Start a Diffbot Crawlbot job for a seed URL. By default returns after job creation (use diffbot_crawl_jobs to inspect). " +
      "Set watch=true to poll until the job finishes and collect url_processed events (can take a while).",
    parameters: Type.Object({
      site: Type.String({ description: "Seed URL or domain to crawl" }),
      hops: Type.Optional(
        Type.Number({ description: "Max link depth (default 2)", minimum: 0, maximum: 10 }),
      ),
      jobName: Type.Optional(Type.String({ description: "Stable job name for later lookup/delete" })),
      maxToCrawl: Type.Optional(
        Type.Number({ description: "Max pages to crawl (default 100)", minimum: 1 }),
      ),
      maxToProcess: Type.Optional(
        Type.Number({ description: "Max pages to process (default 100)", minimum: 1 }),
      ),
      restrictDomain: Type.Optional(
        Type.Boolean({ description: "Stay on seed domain (default true)" }),
      ),
      apiUrl: Type.Optional(
        Type.String({ description: "Diffbot Extract API endpoint for processing (default analyze)" }),
      ),
      crawlDelay: Type.Optional(
        Type.Number({ description: "Delay between requests to same domain (seconds)" }),
      ),
      urlCrawlPattern: Type.Optional(
        Type.String({ description: "Only crawl URLs matching this pattern" }),
      ),
      urlProcessPattern: Type.Optional(
        Type.String({ description: "Only process URLs matching this pattern" }),
      ),
      obeyRobots: Type.Optional(Type.Boolean({ description: "Obey robots.txt (default false)" })),
      useProxies: Type.Optional(Type.Boolean({ description: "Use proxies for crawling (default false)" })),
      customHeaders: Type.Optional(
        Type.String({ description: "Newline-separated custom HTTP headers" }),
      ),
      watch: Type.Optional(
        Type.Boolean({
          description: "Poll until complete and return events (default false — just create job)",
        }),
      ),
      pollInterval: Type.Optional(
        Type.Number({
          description: "Watch poll interval in ms (default 2000)",
          minimum: 500,
        }),
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        const events = [];
        for await (const event of crawl(db, params.site, {
          hops: params.hops,
          jobName: params.jobName,
          maxToCrawl: params.maxToCrawl,
          maxToProcess: params.maxToProcess,
          restrictDomain: params.restrictDomain,
          apiUrl: params.apiUrl,
          crawlDelay: params.crawlDelay,
          urlCrawlPattern: params.urlCrawlPattern,
          urlProcessPattern: params.urlProcessPattern,
          obeyRobots: params.obeyRobots,
          useProxies: params.useProxies,
          customHeaders: params.customHeaders,
          watch: params.watch ?? false,
          pollInterval: params.pollInterval,
        })) {
          if (signal?.aborted) break;
          events.push(event);
        }
        await db.close();
        return ok(formatJson(events));
      } catch (err) {
        return fail("diffbot_crawl", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_crawl_jobs",
    label: "Diffbot Crawl Jobs",
    description:
      "List Diffbot crawler jobs, or get details for one job when jobName is provided.",
    parameters: Type.Object({
      jobName: Type.Optional(
        Type.String({ description: "Job name to inspect; omit to list all jobs" }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        const data = params.jobName
          ? await crawlGetJob(db, params.jobName)
          : await crawlListJobs(db);
        await db.close();
        return ok(formatJson(data));
      } catch (err) {
        return fail("diffbot_crawl_jobs", err);
      }
    },
  });

  pi.registerTool({
    name: "diffbot_crawl_delete",
    label: "Diffbot Crawl Delete",
    description: "Delete a Diffbot crawler job by name.",
    parameters: Type.Object({
      jobName: Type.String({ description: "Job name to delete" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const db = getClient();
        await crawlDeleteJob(db, params.jobName);
        await db.close();
        return ok(formatJson({ deleted: params.jobName }));
      } catch (err) {
        return fail("diffbot_crawl_delete", err);
      }
    },
  });
}
