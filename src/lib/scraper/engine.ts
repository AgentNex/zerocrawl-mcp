import { DOMParser } from "linkedom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import pLimit from "p-limit";

const turndownService = new TurndownService();

interface CacheEntry {
  html: string;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function fetchWithTimeout(url: string, timeoutMs = 4000): Promise<{ html: string; status: number }> {
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
    
    let html = "";
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        html = JSON.stringify(await res.json(), null, 2);
      } else {
        html = await res.text();
      }
    } else {
      // capture error page html if any
      try {
        html = await res.text();
      } catch (e) {}
    }
    return { html, status: res.status };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { html: "", status: 408 };
    }
    return { html: "", status: 500 };
  } finally {
    clearTimeout(id);
  }
}

export async function fetchWithFallback(url: string, useCache = true): Promise<string> {
  if (useCache) {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.html;
    }
  }

  const { html, status } = await fetchWithTimeout(url, 4000);
  
  let needsFallback = false;
  if (status === 403 || status === 429 || status === 408 || status >= 500) {
    needsFallback = true;
  } else if (!html || html.trim() === "") {
    needsFallback = true;
  } else {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const reader = new Readability(doc as any);
      const article = reader.parse();
      if (!article || !article.textContent || article.textContent.trim().length < 50) {
        needsFallback = true;
      }
    } catch (e) {
      needsFallback = true;
    }
  }

  let finalHtml = html;
  if (needsFallback) {
    console.warn(`Fallback triggered for ${url} (status: ${status})`);
    const jinaRes = await fetchWithTimeout(`https://r.jina.ai/${url}`, 5000);
    if (jinaRes.status === 200 && jinaRes.html) {
      finalHtml = jinaRes.html;
    } else {
      if (!finalHtml || finalHtml.trim() === "") {
        throw new Error(`Scrape and fallback failed for ${url}`);
      }
    }
  }

  if (useCache && finalHtml) {
    cache.set(url, { html: finalHtml, timestamp: Date.now() });
  }

  return finalHtml;
}

export async function scrape_page(url: string) {
  try {
    const html = await fetchWithFallback(url);
    
    // r.jina.ai might return markdown, check if it's HTML
    if (html.trim().startsWith("<") && html.toLowerCase().includes("<html")) {
      const document = new DOMParser().parseFromString(html, "text/html");
      const reader = new Readability(document as any);
      const article = reader.parse();
      if (!article || !article.content) {
        return "No text content found.";
      }
      const markdown = turndownService.turndown(article.content);
      return markdown || "No text content found.";
    }
    
    return html || "No text content found.";
  } catch (err: any) {
    throw new Error(`Scrape failed for ${url}: ${err.message}`);
  }
}

export async function batch_scrape(urls: string[]) {
  if (!Array.isArray(urls)) {
    throw new Error("urls must be an array");
  }
  const toScrape = urls.slice(0, 5);
  const limit = pLimit(3);
  
  const results = await Promise.all(
    toScrape.map(url => 
      limit(async () => {
        try {
          const markdown = await scrape_page(url);
          return { url, success: true, markdown };
        } catch (e: any) {
          return { url, success: false, error: e.message };
        }
      })
    )
  );
  return results;
}
