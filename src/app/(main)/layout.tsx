import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex w-full h-full bg-brand-deep/20">
      <Sidebar />
      <main className="flex-1 overflow-auto p-2 md:p-6 lg:p-8">
        <div className="glass-panel min-h-full p-6 lg:p-10 rounded-[2.5rem] relative overflow-hidden">
          {/* Subtle background glow for the content area */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-navy/20 blur-[120px] rounded-full -mr-64 -mt-64" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-steel/10 blur-[100px] rounded-full -ml-40 -mb-40" />
          
          <div className="relative z-10 h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

