export const dynamic = "force-dynamic";

import { SessionDetailPage } from "@/app/pages/SessionDetailPage";

export default async function SessionDetail({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  return <SessionDetailPage id={id} />;
}
