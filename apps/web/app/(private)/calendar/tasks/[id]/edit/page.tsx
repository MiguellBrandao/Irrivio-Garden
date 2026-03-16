import { TaskFormPage } from "@/features/calendar/task-form-page"

type PrivateEditTaskPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function PrivateEditTaskPage({
  params,
}: PrivateEditTaskPageProps) {
  const { id } = await params

  return <TaskFormPage mode="edit" taskId={id} />
}
