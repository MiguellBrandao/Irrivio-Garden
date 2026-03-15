"use client"

import { ClipLoader } from "react-spinners"

type SessionLoadingScreenProps = {
  compact?: boolean
}

export function SessionLoadingScreen({
  compact = false,
}: SessionLoadingScreenProps) {
  const loader = <ClipLoader color="#215442" size={compact ? 26 : 40} speedMultiplier={0.9} />

  if (compact) {
    return <div className="flex items-center justify-center py-4">{loader}</div>
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[linear-gradient(180deg,_#f5f1e5_0%,_#ede6d5_100%)] px-6">
      {loader}
    </div>
  )
}
