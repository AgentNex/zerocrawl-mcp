import { XMLParser } from "fast-xml-parser";

export async function parse_sitemap(domainUrl: string) {
  try {
    let baseUrl = "";
    try {
      baseUrl = new URL(domainUrl).origin;
    } catch {
      baseUrl = new URL(`https://${domainUrl}`).origin;
    }
    
    const paths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap"];
    let sitemapContent = "";
    let sitemapUrl = "";
    
    for (const p of paths) {
      try {
        const url = `${baseUrl}${p}`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        
        if (res.ok) {
          sitemapContent = await res.text();
          sitemapUrl = url;
          break;
        }
      } catch (e) {}
    }
    
    if (!sitemapContent) {
      // Check robots.txt
      try {
        const url = `${baseUrl}/robots.txt`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (res.ok) {
          const robotsTxt = await res.text();
          const match = robotsTxt.match(/Sitemap:\s*(.+)/i);
          if (match && match[1]) {
            const controller2 = new AbortController();
            const id2 = setTimeout(() => controller2.abort(), 4000);
            const res2 = await fetch(match[1].trim(), { signal: controller2.signal });
            clearTimeout(id2);
            if (res2.ok) {
              sitemapContent = await res2.text();
              sitemapUrl = match[1].trim();
            }
          }
        }
      } catch(e) {}
    }
    
    if (!sitemapContent) {
      throw new Error(`Could not find a sitemap for ${baseUrl}`);
    }

    const parser = new XMLParser();
    const result = parser.parse(sitemapContent);
    
    const urls: string[] = [];
    if (result.urlset && result.urlset.url) {
      const urlEntries = Array.isArray(result.urlset.url) ? result.urlset.url : [result.urlset.url];
      for (const entry of urlEntries) {
        if (entry.loc) urls.push(entry.loc);
      }
    } else if (result.sitemapindex && result.sitemapindex.sitemap) {
      const sitemapEntries = Array.isArray(result.sitemapindex.sitemap) ? result.sitemapindex.sitemap : [result.sitemapindex.sitemap];
      for (const entry of sitemapEntries) {
        if (entry.loc) urls.push(entry.loc);
      }
    }

    return {
      sitemapUrl,
      urls: urls.slice(0, 500), 
      totalFound: urls.length
    };
  } catch (err: any) {
    throw new Error(`Failed to parse sitemap for ${domainUrl}: ${err.message}`);
  }
}
