import { DOMParser } from "linkedom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import pLimit from "p-limit";
import * as cheerio from "cheerio";
import { fetchWithTimeout, scrape_page } from "./engine";

const turndownService = new TurndownService();

export async function crawl_domain(startUrl: string, maxPages = 5, maxDepth = 2) {
  maxPages = Math.min(maxPages, 10);
  const visited = new Set<string>();
  const results: any[] = [];
  const limit = pLimit(3);

  let domain = "";
  try {
    domain = new URL(startUrl).hostname;
  } catch (e) {
    throw new Error("Invalid startUrl");
  }

  async function crawl(url: string, depth: number) {
    if (depth > maxDepth || visited.size >= maxPages || visited.has(url)) return;
    visited.add(url);

    try {
      const { html } = await fetchWithTimeout(url, 4000);
      if (!html) return;

      const document = new DOMParser().parseFromString(html, "text/html");
      const reader = new Readability(document as any);
      const article = reader.parse();
      const markdown =
        article && article.content ? turndownService.turndown(article.content) : "";

      results.push({ url, title: article?.title || "", markdown });

      if (depth < maxDepth && visited.size < maxPages) {
        const $ = cheerio.load(html);
        const links = $("a")
          .map((_, el) => $(el).attr("href"))
          .get()
          .filter((href) => href && typeof href === 'string' && !href.startsWith("#") && !href.startsWith("mailto:"));

        const promises = links.map((href) => {
          try {
            const nextUrl = new URL(href, url);
            if (nextUrl.hostname === domain) {
              return limit(() => crawl(nextUrl.href, depth + 1));
            }
          } catch (e) {
            // Invalid URL, ignore
          }
        });
        await Promise.allSettled(promises);
      }
    } catch (e) {
      console.error("Crawl error on", url, e);
    }
  }

  await crawl(startUrl, 0);
  return results;
}

/**
 * Fetch search result links using a multi-strategy approach.
 * Strategy 1: Public SearXNG instances (JSON API) — free, no API key
 * Strategy 2: DuckDuckGo Lite HTML — different endpoint, lighter bot protection
 * Strategy 3: Bing HTML link extraction — fallback
 */
async function fetchSearchLinks(query: string, count: number): Promise<string[]> {
  // --- Strategy 1: SearXNG public instances (JSON API) ---
  const searxngInstances = [
    "https://searx.be",
    "https://paulgo.io",
    "https://searx.tiekoetter.com",
    "https://search.disroot.org",
  ];

  for (const instance of searxngInstances) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`;
      const { html, status } = await fetchWithTimeout(url, 6000);
      if (status === 200 && html) {
        const data = JSON.parse(html);
        if (Array.isArray(data.results) && data.results.length > 0) {
          const links = data.results
            .slice(0, count)
            .map((r: { url?: string }) => r.url)
            .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"));
          if (links.length > 0) return links;
        }
      }
    } catch {
      // Try next instance
    }
  }

  // --- Strategy 2: DuckDuckGo Lite ---
  try {
    const duckUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const { html, status } = await fetchWithTimeout(duckUrl, 6000);
    if (status === 200 && html) {
      const $ = cheerio.load(html);
      const links: string[] = [];
      // DDG lite: result links are in <a class="result-link"> elements
      $("a.result-link, a[href*='//']:not([href*='duckduckgo.com'])").each((_, el) => {
        if (links.length >= count) return false;
        const href = $(el).attr("href");
        if (href && href.startsWith("http") && !href.includes("duckduckgo.com")) {
          links.push(href);
        }
      });
      if (links.length > 0) return links;
    }
  } catch {
    // Fall through
  }

  // --- Strategy 3: Bing HTML ---
  try {
    const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`;
    const { html, status } = await fetchWithTimeout(bingUrl, 6000);
    if (status === 200 && html) {
      const $ = cheerio.load(html);
      const links: string[] = [];
      // Bing result links sit inside <h2><a href="...">
      $("h2 a[href], li.b_algo a[href]").each((_, el) => {
        if (links.length >= count) return false;
        const href = $(el).attr("href");
        if (
          href &&
          href.startsWith("http") &&
          !href.includes("bing.com") &&
          !href.includes("microsoft.com") &&
          !href.includes("msn.com")
        ) {
          links.push(href);
        }
      });
      if (links.length > 0) return links;
    }
  } catch {
    // Fall through
  }

  return [];
}

export async function search_and_crawl(query: string, limitCount = 3) {
  limitCount = Math.min(limitCount, 5);

  const links = await fetchSearchLinks(query, limitCount);

  if (links.length === 0) {
    throw new Error(
      "All search strategies failed — search backends may be temporarily unavailable. Try again shortly."
    );
  }

  const limit = pLimit(3);
  const results = await Promise.all(
    links.map((link) =>
      limit(async () => {
        try {
          const md = await scrape_page(link);
          return { url: link, markdown: md };
        } catch (e) {
          return { url: link, error: String(e) };
        }
      })
    )
  );

  return results;
}
