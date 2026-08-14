import * as cheerio from "cheerio";
import { fetchWithFallback } from "./engine";

export async function extract_metadata(url: string) {
  try {
    const html = await fetchWithFallback(url, true);
    if (!html.trim().startsWith("<") || !html.toLowerCase().includes("<html")) {
      throw new Error("Expected HTML content to parse metadata, got markdown or text.");
    }
    
    const $ = cheerio.load(html);
    const title = $("title").text() || $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content") || "";
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      "";
    const canonical = $('link[rel="canonical"]').attr("href") || $('meta[property="og:url"]').attr("content") || url;
    
    const author = $('meta[name="author"]').attr("content") || $('meta[property="article:author"]').attr("content") || "";
    const publishedDate = $('meta[property="article:published_time"]').attr("content") || "";
    
    const og = {
      image: $('meta[property="og:image"]').attr("content"),
      type: $('meta[property="og:type"]').attr("content"),
      site_name: $('meta[property="og:site_name"]').attr("content"),
    };

    const twitter = {
      card: $('meta[name="twitter:card"]').attr("content"),
      site: $('meta[name="twitter:site"]').attr("content"),
      creator: $('meta[name="twitter:creator"]').attr("content"),
      image: $('meta[name="twitter:image"]').attr("content"),
    };

    const jsonLd: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (content) jsonLd.push(JSON.parse(content));
      } catch (e) {
        // ignore invalid json
      }
    });

    return { 
      url, 
      title, 
      description, 
      canonical, 
      author, 
      publishedDate, 
      og, 
      twitter, 
      jsonLd 
    };
  } catch (err: any) {
    throw new Error(`Failed to extract metadata for ${url}: ${err.message}`);
  }
}
