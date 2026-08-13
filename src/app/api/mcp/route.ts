import { createMcpServer } from "@/lib/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

function patchRequest(req: Request): Request {
  const originalGet = req.headers.get.bind(req.headers);
  req.headers.get = (name: string) => {
    if (name.toLowerCase() === 'accept') return 'application/json, text/event-stream';
    return originalGet(name);
  };
  return req;
}

async function handle(req: Request) {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  
  // We do NOT await connect since it returns a Promise that resolves when transport is closed.
  server.connect(transport).catch(console.error);
  
  return await transport.handleRequest(patchRequest(req));
}

export async function GET(req: Request) {
  try {
    return await handle(req);
  } catch (err: any) {
    return new Response(err.stack || err.message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err: any) {
    return new Response(err.stack || err.message, { status: 500 });
  }
}

// Ensure Vercel uses Node.js runtime instead of Edge,
// since some libraries might rely on node builtins (like 'cheerio', 'jsdom', etc.)
// although linkedom might support Edge. We'll use nodejs for maximum compatibility.
export const runtime = "nodejs";
