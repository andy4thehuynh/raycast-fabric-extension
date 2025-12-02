import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  Clipboard,
  Icon,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { loadPatterns, findFabricCommand } from "./utils";
import type { Pattern } from "./types";

export default function Command() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fabricPath, setFabricPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const path = await findFabricCommand();
        if (!path) {
          setError("Fabric command not found. Please install fabric first.");
          setIsLoading(false);

          return;
        }
        setFabricPath(path);

        const loadedPatterns = await loadPatterns();
        if (loadedPatterns.length === 0) {
          setError("No fabric patterns found in ~/.config/fabric/patterns");
          setIsLoading(false);

          return;
        }
        setPatterns(loadedPatterns);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");

      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Install Fabric"
              url="https://github.com/danielmiessler/fabric"
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search fabric patterns..."
      filtering={true}
    >
      {patterns.map((pattern) => (
        <List.Item
          key={pattern.name}
          title={pattern.name}
          subtitle={pattern.description}
          icon={Icon.Terminal}
          accessories={[{ text: "Run Pattern" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Run Pattern"
                icon={Icon.Play}
                target={<RunPatternView pattern={pattern} fabricPath={fabricPath!} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RunPatternView({ pattern, fabricPath }: { pattern: Pattern; fabricPath: string }) {
  const [clipboardContent, setClipboardContent] = useState<string>("");
  const [shouldExecute, setShouldExecute] = useState(false);

  useEffect(() => {
    async function readClipboard() {
      try {
        const text = await Clipboard.readText();
        if (!text || text.trim().length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Empty Clipboard",
            message: "Please copy some text to your clipboard first",
          });
          return;
        }
        setClipboardContent(text);
        setShouldExecute(true);

      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to read clipboard",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    readClipboard();
  }, []);

  // Execute fabric command
  const { isLoading, data, error } = useExec(
    fabricPath,
    ["--pattern", pattern.name],
    {
      execute: shouldExecute && clipboardContent.length > 0,
      input: clipboardContent,
      timeout: 300000, // 5m for LLM processing
      parseOutput: (output) => {
        return output.stdout;
      },
    }
  );

  // Show loading state
  if (isLoading) {
    return (
      <Detail
        markdown={`# Running Fabric Pattern: ${pattern.name}\n\nProcessing ${clipboardContent.length} characters from clipboard...`}
        isLoading={true}
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <Detail
        markdown={`# Error Running Pattern\n\n\`\`\`\n${error.message}\n\`\`\`\n\n## Pattern\n${pattern.name}\n\n## Input Length\n${clipboardContent.length} characters`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={error.message} />
          </ActionPanel>
        }
      />
    );
  }

  // Show result
  const markdown = `# ${pattern.name}\n\n${data || "No output"}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Result: ${pattern.name}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={data || ""} />
          <Action.Paste title="Paste Result" content={data || ""} />
        </ActionPanel>
      }
    />
  );
}
