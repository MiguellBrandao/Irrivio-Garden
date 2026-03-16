import { TaskFormPage } from "@/features/calendar/task-form-page"

type PrivateNewTaskPageProps = {
  searchParams: Promise<{
    date?: string
  }>
}

export default async function PrivateNewTaskPage({
  searchParams,
}: PrivateNewTaskPageProps) {
  const { date } = await searchParams

  return <TaskFormPage mode="create" defaultDate={date} />
}
