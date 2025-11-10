import { readdir, readFile, access } from "fs/promises";
import { join } from "path";
import { constants } from "fs";
import { PATTERNS_DIR, FABRIC_COMMAND_PATHS } from "./constants";
import type { Pattern } from "./types";

/**
 * Find the fabric command executable
 */
export async function findFabricCommand(): Promise<string | null> {
  // Try common paths
  for (const path of FABRIC_COMMAND_PATHS) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      continue;
    }
  }

  // Try using 'which' command through bash
  try {
    const { execSync } = require("child_process");
    const result = execSync("bash -lc 'which fabric'", {
      encoding: "utf-8",
    }).trim();

    if (result) {
      return result;
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Load all fabric patterns from the patterns directory
 */
export async function loadPatterns(): Promise<Pattern[]> {
  try {
    const entries = await readdir(PATTERNS_DIR, { withFileTypes: true });

    const patterns: Pattern[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }

      const pattern: Pattern = {
        name: entry.name,
      };

      // Try to read system.md for description
      try {
        const systemMdPath = join(PATTERNS_DIR, entry.name, "system.md");
        const content = await readFile(systemMdPath, "utf-8");

        // Extract first non-empty line as description (skip markdown headers)
        const lines = content.split("\n");
        for (const line of lines) {
          const cleaned = line.trim();
          if (cleaned && !cleaned.startsWith("#")) {
            pattern.description = cleaned.substring(0, 100);
            break;
          }
        }
      } catch {
        // No description available
      }

      patterns.push(pattern);
    }

    return patterns.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error(`Failed to load patterns: ${error}`);
  }
}
