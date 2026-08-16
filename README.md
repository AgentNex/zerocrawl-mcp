<div align="center">
  <img src="assets/logo.png" width="160" height="160" alt="ZeroCrawl MCP Logo" />
  <h1>ZeroCrawl MCP — 100% Free Web Crawling & Scraping MCP Server</h1>
  <p><em>Zero-budget, no-API-key web scraping and content extraction for Claude Desktop, Cursor, and AI Agents built with Google Antigravity CLI.</em></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Vercel Serverless Ready](https://img.shields.io/badge/Vercel-Serverless%20Ready-black?logo=vercel)](https://vercel.com)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![MCP Protocol](https://img.shields.io/badge/MCP-v2024--11--05-green)](https://modelcontextprotocol.io/)
  [![Free Tier](https://img.shields.io/badge/Status-100%25%20Free-success)](#)
</div>

---

## 🚀 1-Click Deploy

Deploy your own private instance of ZeroCrawl in seconds:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2Fzerocrawl-mcp&project-name=zerocrawl-mcp&repository-name=zerocrawl-mcp&env=AUTH_TOKEN&envDescription=Optional%3A+Set+a+secret+Bearer+token+to+protect+your+MCP+server.)

---

## 📖 Overview
ZeroCrawl MCP is a **100% free forever** web crawling and scraping server designed for the Model Context Protocol (MCP). It allows AI agents, LLM tools, and IDEs like Claude Desktop and Cursor to navigate the web with zero budget. It requires no paid API keys and operates seamlessly within the limits of Vercel's Free Tier.

## 🛠 Available Tools

| Tool Name | Parameters | Description | Output Format |
|-----------|------------|-------------|---------------|
| `scrape_page` | `url` (string) | Fetches URL, cleans DOM with Readability, converts to Markdown, auto-fallback to Jina Reader on 403/SPA. | Markdown |
| `crawl_domain` | `startUrl` (string), `maxPages` (number), `maxDepth` (number) | Recursive same-domain link crawler with depth control and concurrency caps. | JSON |
| `extract_metadata` | `url` (string) | Structured OpenGraph, Twitter Cards, schema JSON-LD, and canonical data. | JSON |
| `get_screenshot_and_media` | `url` (string) | High-res full-page screenshot URL via Microlink + image URL extraction with alt tags. | JSON |
| `parse_sitemap` | `domainUrl` (string) | XML sitemap and sitemap index parser. | JSON |
| `batch_scrape` | `urls` (string[]) | Concurrent multi-URL scraping engine. | Array of Markdown |
| `search_and_crawl` | `query` (string), `limit` (number) | Fetch web search results and concurrently scrape each target link. | JSON |

---

## <img src="https://upload.wikimedia.org/wikipedia/commons/2/21/Vercel_logo.svg" width="20" height="20" alt="Vercel" /> Installation & Setup

We highly recommend utilizing our **1-Click Autonomous Agent Setup** to completely eliminate manual configuration.

### <img src="https://img.shields.io/badge/AI_Agent_Setup-000000?style=for-the-badge&logo=openai&logoColor=white" alt="AI Agent Setup" />

Don't want to configure this manually? Copy and paste the prompt below directly into your AI coding assistant (like Cursor, Windsurf, or Google Antigravity). Your AI will autonomously install, configure, and deploy the ZeroCrawl MCP server for you!

> **Copy & Paste this into your AI Agent:**
> ```text
> Please install, configure, and deploy the ZeroCrawl MCP Server to my Vercel account. 
> 
> Execute these exact steps sequentially:
> 1. Run `git clone https://github.com/AgentNex/zerocrawl-mcp.git` and `cd zerocrawl-mcp`.
> 2. Run `npm install` to install all necessary packages.
> 3. Copy `.env.example` to `.env` and generate a secure random string for `AUTH_TOKEN`.
> 4. Run `npx vercel link --yes` to link the project to my Vercel account.
> 5. Deploy the project to production by running `npx vercel deploy --prod`.
> 6. Once successfully deployed, please configure my local MCP settings (in Claude Desktop or Cursor) to point to the new Vercel production URL at the `/api/mcp` endpoint using the `AUTH_TOKEN` you generated.
> ```

---

## <img src="https://img.shields.io/badge/Architecture-1E293B?style=for-the-badge&logo=amazonaws&logoColor=white" alt="Architecture" /> Performance Breakdown

ZeroCrawl is built from the ground up to operate within the constraints of Vercel's Free Tier:
- **Sub-9s Timeout Safeguards:** Operations automatically gracefully downgrade or return partial data to prevent serverless timeouts.
- **In-Memory TTL Caching Layer:** Eliminates redundant fetching and scraping by returning instant responses for recent queries within a 10-minute window.
- **Zero-Chromium Architecture:** Bypasses the need for heavy headless browsers. It leverages smart HTTP fetchers, DOM cleanup with Mozilla's Readability, and Turndown for clean Markdown generation. For complex SPAs or blocks, it automatically falls back to Jina Reader APIs.

---

## 📄 License
MIT License (2026). See [LICENSE](LICENSE) for details.
