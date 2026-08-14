import * as cheerio from "cheerio";
import { fetchWithFallback } from "./engine";

export async function get_screenshot_and_media(url: string) {
  try {
    const screenshotUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&embed=screenshot.url`;

    let html = "";
    try {
      html = await fetchWithFallback(url, true);
    } catch (e) {
      // ignore, we can still return the screenshot URL
    }
    
    const images: { src: string, alt: string }[] = [];
    
    if (html && html.trim().startsWith("<") && html.toLowerCase().includes("<html")) {
      const $ = cheerio.load(html);
      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        const alt = $(el).attr("alt") || "";
        if (src) {
          try {
            const absoluteSrc = new URL(src, url).href;
            images.push({ src: absoluteSrc, alt: alt.trim() });
          } catch {
            images.push({ src, alt: alt.trim() });
          }
        }
      });
    }

    return {
      url,
      screenshotUrl,
      images
    };
  } catch (err: any) {
    throw new Error(`Failed to capture media for ${url}: ${err.message}`);
  }
}
