import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { scrape_page, extract_metadata, crawl_domain, search_and_crawl } from "./scraper";

const server = new Server(
  {
    name: "vercel-mcp-web-crawler",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// We define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "scrape_page",
        description: "Fetch URL and convert to clean Markdown. Fallbacks to Jina reader if initial fetch fails.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to scrape" },
          },
          required: ["url"],
        },
      },
      {
        name: "crawl_domain",
        description: "Recursively crawl same-domain internal links up to maxDepth or maxPages.",
        inputSchema: {
          type: "object",
          properties: {
            startUrl: { type: "string" },
            maxPages: { type: "number", default: 5 },
            maxDepth: { type: "number", default: 2 },
          },
          required: ["startUrl"],
        },
      },
      {
        name: "extract_metadata",
        description: "Parse title, meta descriptions, OpenGraph tags, canonical links, and JSON-LD structured data.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
          },
          required: ["url"],
        },
      },
      {
        name: "search_and_crawl",
        description: "Fetch web search results, isolate top target links, and concurrently scrape each target link.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            limit: { type: "number", default: 3 },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// Implement tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    let result: any;

    if (name === "scrape_page") {
      const { url } = args as { url: string };
      result = await scrape_page(url);
    } else if (name === "crawl_domain") {
      const { startUrl, maxPages, maxDepth } = args as { startUrl: string; maxPages?: number; maxDepth?: number };
      result = await crawl_domain(startUrl, maxPages, maxDepth);
    } else if (name === "extract_metadata") {
      const { url } = args as { url: string };
      result = await extract_metadata(url);
    } else if (name === "search_and_crawl") {
      const { query, limit } = args as { query: string; limit?: number };
      result = await search_and_crawl(query, limit);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error: ${error?.message || String(error)}`,
        },
      ],
    };
  }
});

// Configure transport for Next.js Edge/Serverless environments
export const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
});

// Connect transport to server
server.connect(transport).catch((err) => {
  console.error("Failed to connect transport to server", err);
});
