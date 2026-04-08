import { ThreadPageClient } from "@/components/chat/ThreadPageClient";

type ThreadPageProps = {
  params: Promise<{
    threadId: string;
  }>;
};

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  return <ThreadPageClient threadId={threadId} />;
}
