import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "app",
  buildDirectory: "build",
  future: {
    v8_viteEnvironmentApi: true,
  },
  prerender: true,
} satisfies Config;
