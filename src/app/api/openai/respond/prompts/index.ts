import { buildSystemPromptV1 } from "./v1";
import { buildSystemPromptV2 } from "./v2";
import { buildSystemPromptV3 } from "./v3";
import { buildSystemPromptV4 } from "./v4";

export { buildSystemPromptV1, buildSystemPromptV2, buildSystemPromptV3, buildSystemPromptV4 };

/**
 * Active system prompt builder.
 * Change the version here to switch which prompt the AI uses.
 */
export const buildSystemPrompt = (language: "en" | "ja" = "en"): string => {
  return buildSystemPromptV4(language);
};
