import OpenAI from "openai";
import { AI_CONFIG } from "@/app/api/openai/respond/config/ai.config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  timeout: 60000,
});

/**
 * Extract text content from a PDF or image using OpenAI's input_file API.
 * Single message, no system prompt — cheap and fast.
 */
export async function extractFileContent(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const base64Data = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64Data}`;
  const isImage = mimeType.startsWith("image/");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (openai.responses as any).create({
    model: AI_CONFIG.INGESTION.VISION_MODEL,
    input: [
      {
        role: "user",
        content: [
          isImage
            ? { type: "input_image", image_url: dataUri }
            : { type: "input_file", filename: fileName, file_data: dataUri },
          {
            type: "input_text",
            text: isImage
              ? "Describe this image in detail: i.e. the scene, objects, people, actions, colors, and mood. Include any visible text exactly as written."
              : "Extract all text from this file, then append a structured summary. Omit fields not found in the document.\n\n[Extracted Text]\n(full text)\n\n[Summary]\nDocument type:\nTitle:\nDescription:\nDepartment:\nVendor:\nAmount:\nDate:\nPurpose:\nItems: (name, qty, unit_price, subtotal)\nPayment method:\nTax rate:\nPriority:\nRemarks:",
          },
        ],
      },
    ],
    max_output_tokens: AI_CONFIG.INGESTION.VISION_MAX_TOKENS,
    text: { verbosity: "high" },
  });

  return response.output_text ?? "";
}
