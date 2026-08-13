import { transport } from "@/lib/mcp";

function patchRequest(req: Request): Request {
  const originalGet = req.headers.get.bind(req.headers);
  req.headers.get = (name: string) => {
    if (name.toLowerCase() === 'accept') return 'application/json, text/event-stream';
    return originalGet(name);
  };
  return req;
}

export async function GET(req: Request) {
  try {
    return await transport.handleRequest(patchRequest(req));
  } catch (err: any) {
    return new Response(err.stack || err.message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    return await transport.handleRequest(patchRequest(req));
  } catch (err: any) {
    return new Response(err.stack || err.message, { status: 500 });
  }
}

// Ensure Vercel uses Node.js runtime instead of Edge,
// since some libraries might rely on node builtins (like 'cheerio', 'jsdom', etc.)
// although linkedom might support Edge. We'll use nodejs for maximum compatibility.
export const runtime = "nodejs";
