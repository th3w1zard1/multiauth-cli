#!/usr/bin/env node
import { runClWithMultiauth } from "./wrapper/run.js";
import { getFirecrawlAdapter } from "./adapters/firecrawl-adapter.js";

const code = await runClWithMultiauth(
  getFirecrawlAdapter(),
  process.argv.slice(2),
);
process.exit(code);
