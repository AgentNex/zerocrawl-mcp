# Vercel MCP Web Crawler

This is a production-ready, ultra-lightweight Web Crawling Model Context Protocol (MCP) server. It is built with TypeScript and Next.js (App Router), specifically optimized for deployment on Vercel's Free Tier.

## Features

- **No Heavy Headless Browsers**: Uses `fetch`, `cheerio`, `linkedom`, `@mozilla/readability`, and `turndown` for lightweight and fast scraping.
- **Vercel Free Tier Ready**: Strict execution limits via `AbortController` (4s timeout per request) and concurrency control with `p-limit`.
- **MCP Server over HTTP**: Fully compatible with remote HTTP/SSE Model Context Protocol endpoint standards using `@modelcontextprotocol/sdk`.

## Available Tools

1. `scrape_page`: Fetch URL and convert to clean Markdown. Fallbacks to `https://r.jina.ai/<url>`.
2. `crawl_domain`: Recursively crawl same-domain internal links (max 10 pages).
3. `extract_metadata`: Parse title, meta descriptions, OpenGraph tags, canonical links, and JSON-LD.
4. `search_and_crawl`: Fetch web search results, isolate top target links, and concurrently scrape them.

## Setup & Deployment

1. **Deploy to Vercel**: Push this repository to GitHub and import it into Vercel. 
2. **Environment**: No environment variables are required.

## Client Configuration

To connect Cursor, Windsurf, or Claude Code to your deployed MCP server, you can use the built-in MCP HTTP Client support. Some editors support providing a direct HTTP/SSE endpoint.

### Claude Code / Cursor / Windsurf Configuration Snippet

In your MCP client configuration (e.g., `mcp.json` or `.claude_code/config.json`), use the `sse` transport:

```json
{
  "mcpServers": {
    "zerocrawl": {
      "serverUrl": "https://mcp-web-crawler.vercel.app/api/mcp"
    }
  }
}
```
*Note: Since standard MCP config uses local commands, you might need an SSE client adapter if your editor doesn't support direct URL configurations. Claude Desktop recently added standard Server-Sent Events (SSE) support or you can use `mcp-proxy` scripts to bridge stdin to SSE.*

If your editor natively supports Remote SSE MCP Servers, just provide the endpoint:
**SSE Endpoint**: `https://<your-vercel-domain>.vercel.app/api/mcp`
