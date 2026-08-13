import { transport } from "@/lib/mcp";

export async function GET(req: Request) {
  return await transport.handleRequest(req);
}

export async function POST(req: Request) {
  return await transport.handleRequest(req);
}

// Ensure Vercel uses Node.js runtime instead of Edge,
// since some libraries might rely on node builtins (like 'cheerio', 'jsdom', etc.)
// although linkedom might support Edge. We'll use nodejs for maximum compatibility.
export const runtime = "nodejs";
