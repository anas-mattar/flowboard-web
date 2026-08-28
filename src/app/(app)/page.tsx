import { BackendStatus } from "@/components/shell/backend-status";
import { TopBar } from "@/components/layout/top-bar";

// Shell isolation (FR-007): the top bar and theme toggle render unconditionally;
// only BackendStatus depends on the health query's outcome.
export default function HomePage() {
  return (
    <>
      <TopBar />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">FlowBoard</h1>
        <p className="text-sm text-foreground/70">
          Kanban boards for teams — delivery skeleton
        </p>
        <BackendStatus />
      </main>
    </>
  );
}
