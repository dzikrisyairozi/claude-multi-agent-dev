import { MgappChatClient } from "../_components/MgappChatClient";

type MgappThreadPageProps = {
  params: Promise<{
    threadId: string;
  }>;
};

export default async function MgappThreadPage({ params }: MgappThreadPageProps) {
  const { threadId } = await params;
  return <MgappChatClient threadId={threadId} />;
}
