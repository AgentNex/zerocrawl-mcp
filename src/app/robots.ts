import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/docs/'],
      disallow: ['/api/'],
    },
    sitemap: 'https://github.com/AgentNex/zerocrawl-mcp/sitemap.xml',
  };
}
