import { defineConfig } from "@trigger.dev/sdk";
import { config } from "dotenv";

config({ path: "../../.env" });

export default defineConfig({
  project: "proj_nfcxqgbqzccpqekxvsez",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      randomize: true,
    },
  },
});
