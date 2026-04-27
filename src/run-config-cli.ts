#!/usr/bin/env node
import { runConfigMain } from "./run-config.js";

runConfigMain(process.argv)
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
