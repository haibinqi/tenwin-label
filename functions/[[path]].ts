import { createRequestHandler } from "@react-router/cloudflare";
// @ts-ignore - This file won"t exist until the build
import * as build from "../build/server";

interface CloudflareEnvironment {
  DB: D1Database;
  CACHE: KVNamespace;
}

const requestHandler = createRequestHandler(build);

export default {
  async fetch(
    request: Request,
    env: CloudflareEnvironment,
    ctx: ExecutionContext
  ): Promise<Response> {
    return requestHandler(request, env, ctx);
  },
};
