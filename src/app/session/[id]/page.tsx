import { SessionDetailPage } from "@/pages/SessionDetailPage";

export default async function SessionDetail({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  console.log("Session id", id);
  return <SessionDetailPage id={id} />;
}
