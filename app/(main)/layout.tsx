import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 bg-background overflow-auto">
        {children}
      </main>
    </div>
  );
}
