import { geminiTextEmbedding, TASK_TYPE } from "@/service/gemini/embedding";

export const embedQuery = async (input: string): Promise<number[]> => {
  return geminiTextEmbedding(input, TASK_TYPE.RETRIEVAL_QUERY);
};
