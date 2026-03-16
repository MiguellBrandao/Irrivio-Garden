import { TaskDetailsPage } from "@/features/calendar/task-details-page"

type PrivateTaskDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function PrivateTaskDetailsPage({
  params,
}: PrivateTaskDetailsPageProps) {
  const { id } = await params

  return <TaskDetailsPage taskId={id} />
}
