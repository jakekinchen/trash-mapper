import Map from "@/components/map"
import { Toaster } from "@/components/ui/toaster"
import { MobileOptimizations } from "@/components/mobile-optimizations"

export default function Home() {
  return (
    <main className="h-screen w-full relative">
      <Map />
      <Toaster />
      <MobileOptimizations />
    </main>
  )
}
