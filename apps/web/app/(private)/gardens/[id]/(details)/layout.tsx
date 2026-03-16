import { GardenSectionsLayout } from "@/features/gardens/garden-sections-layout"

export default async function GardenDetailsLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ id: string }>
}>) {
  const { id } = await params

  return <GardenSectionsLayout gardenId={id}>{children}</GardenSectionsLayout>
}
