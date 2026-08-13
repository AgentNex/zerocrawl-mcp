import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { DOMParser } from "linkedom";
import TurndownService from "turndown";
import pLimit from "p-limit";

const turndownService = new TurndownService();

/**
 * Fetch with an AbortController timeout.
 */
async function fetchWithTimeout(url: string, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    const text = await res.text();
    return text;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Scrape a page using linkedom + readability + turndown
 */
export async function scrape_page(url: string) {
  try {
    const html = await fetchWithTimeout(url, 4000);
    if (typeof html !== "string") {
      return JSON.stringify(html, null, 2);
    }
    const document = new DOMParser().parseFromString(html, "text/html");
    const reader = new Readability(document as any);
    const article = reader.parse();
    if (!article || !article.content) {
      throw new Error("Readability returned empty content");
    }
    const markdown = turndownService.turndown(article.content);
    return markdown || "No text content found.";
  } catch (err) {
    console.warn(`Primary scrape failed for ${url}, trying fallback.`, err);
    try {
      const fallbackHtml = await fetchWithTimeout(`https://r.jina.ai/${url}`, 5000);
      return typeof fallbackHtml === "string" ? fallbackHtml : JSON.stringify(fallbackHtml, null, 2);
    } catch (fallbackErr) {
      throw new Error(`Scrape and fallback failed for ${url}: ${err}`);
    }
  }
}

/**
 * Extract metadata (title, description, canonical, jsonLd) from a URL
 */
export async function extract_metadata(url: string) {
  try {
    const html = await fetchWithTimeout(url, 4000);
    if (typeof html !== "string") {
      throw new Error("Expected HTML, got JSON");
    }
    const $ = cheerio.load(html);
    const title = $("title").text() || $('meta[property="og:title"]').attr("content") || "";
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";
    const canonical = $('link[rel="canonical"]').attr("href") || "";

    const jsonLd: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (content) jsonLd.push(JSON.parse(content));
      } catch (e) {
        // ignore invalid json
      }
    });

    return { url, title, description, canonical, jsonLd };
  } catch (err) {
    throw new Error(`Failed to extract metadata for ${url}: ${err}`);
  }
}

/**
 * Crawl domain up to maxDepth or maxPages using a concurrency limiter
 */
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
      const html = await fetchWithTimeout(url, 4000);
      if (typeof html !== "string") return;

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
          .filter((href) => href && !href.startsWith("#") && !href.startsWith("mailto:"));

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
 * Search DDG HTML and scrape top links concurrently
 */
export async function search_and_crawl(query: string, limitCount = 3) {
  limitCount = Math.min(limitCount, 5);
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  let html = "";
  try {
    const raw = await fetchWithTimeout(searchUrl, 4000);
    if (typeof raw !== "string") throw new Error("Expected HTML");
    html = raw;
  } catch (err) {
    throw new Error(`Search request failed: ${err}`);
  }

  const $ = cheerio.load(html);
  const links: string[] = [];
  $(".result__url").each((_, el) => {
    const href = $(el).attr("href");
    if (href && links.length < limitCount) {
      const match = href.match(/uddg=([^&]+)/);
      if (match) {
        links.push(decodeURIComponent(match[1]));
      } else if (href.startsWith("http")) {
        links.push(href);
      }
    }
  });

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
