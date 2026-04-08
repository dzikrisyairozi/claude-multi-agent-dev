import { ToolCall } from "../types";

/**
 * Progress Message Generator
 * Generates user-friendly progress messages for tool executions
 *
 * Follows Open/Closed Principle:
 * - Open for extension: Easy to add new tool messages
 * - Closed for modification: Existing messages don't need changes
 */
export class ProgressMessageGenerator {
  private static readonly TOOL_MESSAGES: Record<string, (args?: Record<string, unknown>) => string> = {
    search_user_documents: () => "🔍 Searching your documents...",

    manage_documents: (args?: Record<string, unknown>) => {
      switch (args?.action) {
        case "get_content":
          return "📄 Reading document content...";
        case "search":
          return "🔍 Searching for documents...";
        case "move":
          return "📂 Moving document to folder...";
        default:
          return "📁 Managing documents...";
      }
    },

    manage_folders: () => "📁 Managing folders...",

    manage_approval_requests: () => "✅ Processing approval request...",

    search_submissions: () => "🔎 Searching approval requests...",
  };

  /**
   * Default message for unknown tools
   */
  private static readonly DEFAULT_MESSAGE = (toolName: string) =>
    `⚙️ Running ${toolName}...`;

  /**
   * Generate a progress message for a tool call
   * @param toolCall - The tool call to generate a message for
   * @returns User-friendly progress message
   */
  static generate(toolCall: ToolCall): string {
    const toolName = toolCall.function.name;
    const messageGenerator = this.TOOL_MESSAGES[toolName];

    if (!messageGenerator) {
      return this.DEFAULT_MESSAGE(toolName);
    }

    try {
      const args = JSON.parse(toolCall.function.arguments || "{}");
      return messageGenerator(args);
    } catch {
      // If argument parsing fails, use the generator without args
      return messageGenerator();
    }
  }

  /**
   * Register a custom message generator for a tool
   * Allows extension without modifying this class
   * @param toolName - Name of the tool
   * @param generator - Function that generates the message
   */
  static register(
    toolName: string,
    generator: (args?: Record<string, unknown>) => string
  ): void {
    this.TOOL_MESSAGES[toolName] = generator;
  }
}
