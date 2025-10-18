import { SessionDetailPage } from "@/pages/SessionDetailPage";

export default function SessionDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  console.log("Session id", id);
  return (
    <>
      <SessionDetailPage id={id} />
    </>
  );
}
