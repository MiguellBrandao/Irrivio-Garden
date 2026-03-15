import { LoginRouteGuard } from "@/components/login-route-guard"
import { LoginForm } from "@/components/login-form"

export default function Page() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[linear-gradient(180deg,_#f2efe4_0%,_#e6e0ce_100%)] p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(33,84,66,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(128,90,42,0.18),_transparent_24%)]" />
      <div className="relative flex w-full max-w-md items-center justify-center">
        <LoginRouteGuard>
          <LoginForm className="w-full" />
        </LoginRouteGuard>
      </div>
    </div>
  )
}
