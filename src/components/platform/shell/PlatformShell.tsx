import PlatformBreadcrumb from "./PlatformBreadcrumb";
import Footer from "../../Footer";

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="platform-shell relative flex min-h-[100svh] flex-col">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[#050505] overflow-hidden"
      >
        {/* Ambient lighting */}
        <div className="absolute left-1/2 top-[-10%] h-[70vh] w-[100vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(124,58,237,0.18),transparent_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[60vh] w-[60vw] rounded-full bg-[radial-gradient(ellipse,rgba(34,211,238,0.15),transparent_70%)] blur-[100px]" />
        <div className="absolute left-[-10%] top-[30%] h-[50vh] w-[40vw] rounded-full bg-[radial-gradient(ellipse,rgba(244,63,94,0.08),transparent_70%)] blur-[100px]" />

        {/* Tactical Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_80%)]" />
        
        {/* Subtle Scanlines overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-20 pt-40 sm:px-6">
        <PlatformBreadcrumb />
        <div id="main-content" className="flex-1">{children}</div>
      </div>
      
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
