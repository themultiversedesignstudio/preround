import { StudyWorkspace } from "@/components/study-workspace"

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <StudyWorkspace id={id} />
}
