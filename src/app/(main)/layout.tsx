import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen w-screen bg-[#10141a] flex">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[#10141a]">
        {children}
      </main>
    </div>
  );
}

