import { homedir } from "os";
import { join } from "path";

export const PATTERNS_DIR = join(homedir(), ".config", "fabric", "patterns");

export const FABRIC_COMMAND_PATHS = [
  join(homedir(), ".local", "bin", "fabric"),
  join(homedir(), "go", "bin", "fabric"),
  "/usr/local/bin/fabric-ai",
  "/opt/homebrew/bin/fabric-ai",
];
