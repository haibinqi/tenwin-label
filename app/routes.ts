import type { RouteConfig } from "@react-router/dev/routes";
import { layout, index, route } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    index("routes/_layout._index.tsx"),
    route("templates", "routes/_layout.templates.tsx"),
    route("batches", "routes/_layout.batches.tsx"),
    route("history", "routes/_layout.history.tsx"),
  ]),
  route("print/:batchId", "routes/print.$batchId.tsx"),
] satisfies RouteConfig;
