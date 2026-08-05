import { redirect } from "next/navigation";

export default async function MyProjectDetailIndexPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/my-projects/${projectId}/overview`);
}
