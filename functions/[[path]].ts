import { createRequestHandler } from "@react-router/cloudflare";

interface CloudflareEnvironment {
  DB: D1Database;
  CACHE: KVNamespace;
}

// @ts-ignore - Build output will exist after build
import * as build from "../build/server";

const requestHandler = createRequestHandler(build);

export default {
  async fetch(
    request: Request,
    env: CloudflareEnvironment,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      return await requestHandler(request, env, ctx);
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
