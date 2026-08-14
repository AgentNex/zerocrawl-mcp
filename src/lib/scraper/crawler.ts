import { DOMParser } from "linkedom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import pLimit from "p-limit";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
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
 * Resolve a Google News redirect URL to the actual article URL.
 * Google News RSS <link> elements are redirect URLs; fetch follows them automatically.
 */
async function resolveGoogleNewsUrl(redirectUrl: string): Promise<string> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(redirectUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    clearTimeout(id);
    // res.url is the final URL after all redirects
    if (res.url && res.url.startsWith("http") && !res.url.includes("news.google.com")) {
      return res.url;
    }
  } catch {
    // Return original if redirect resolution fails
  }
  return redirectUrl;
}

/**
 * Fetch search result links using sources confirmed to work from Vercel server IPs.
 * Strategy 1: Bing News RSS     — free, direct article URLs, no IP-block
 * Strategy 2: HackerNews Algolia API — free JSON API, no auth, direct URLs
 * Strategy 3: Google News RSS   — free, but requires redirect resolution
 */
async function fetchSearchLinks(query: string, count: number): Promise<string[]> {
  const xmlParser = new XMLParser({ ignoreAttributes: false });

  // --- Strategy 1: Bing News RSS (direct article URLs) ---
  try {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=RSS`;
    const { html, status } = await fetchWithTimeout(url, 6000);
    if (status === 200 && html) {
      const parsed = xmlParser.parse(html);
      const rawItems = parsed?.rss?.channel?.item ?? [];
      const items: Array<{ link?: string }> = Array.isArray(rawItems) ? rawItems : [rawItems];
      const links = items
        .slice(0, count)
        .map((item) => item.link)
        .filter((u): u is string => typeof u === "string" && u.startsWith("http"));
      if (links.length > 0) return links;
    }
  } catch {
    // Fall through
  }

  // --- Strategy 2: HackerNews Algolia API (great for tech topics) ---
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${count * 2}&tags=story`;
    const { html, status } = await fetchWithTimeout(url, 6000);
    if (status === 200 && html) {
      const data = JSON.parse(html);
      const links = (data.hits ?? [])
        .map((hit: { url?: string }) => hit.url)
        .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"))
        .slice(0, count);
      if (links.length > 0) return links;
    }
  } catch {
    // Fall through
  }

  // --- Strategy 3: Google News RSS with redirect resolution ---
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const { html, status } = await fetchWithTimeout(url, 6000);
    if (status === 200 && html) {
      const parsed = xmlParser.parse(html);
      const rawItems = parsed?.rss?.channel?.item ?? [];
      const items: Array<{ link?: string; guid?: string }> = Array.isArray(rawItems)
        ? rawItems
        : [rawItems];
      const redirectLinks = items
        .slice(0, count)
        .map((item) => item.link || item.guid)
        .filter((u): u is string => typeof u === "string" && u.startsWith("http"));

      if (redirectLinks.length > 0) {
        // Resolve Google News redirect URLs to get actual article URLs
        const resolved = await Promise.all(redirectLinks.map(resolveGoogleNewsUrl));
        const directLinks = resolved.filter((u) => u.startsWith("http"));
        if (directLinks.length > 0) return directLinks;
      }
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
