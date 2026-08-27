import { ThemeToggle } from "@/components/shell/theme-toggle";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { auth } from "@/lib/auth/auth-config";

// US2: workspace identity in the shell, no extra step — the session already carries it
// (research R-5, R-6: identity-only backend claims, but the frontend session projection
// includes workspace name/role from sign-in, ADR-10's single-workspace-owner model).
export async function TopBar() {
  const session = await auth();

  return (
    <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold tracking-tight">FlowBoard</span>
        {session?.user && (
          <span className="text-sm text-muted-foreground">
            {session.user.workspaceName} · {session.user.workspaceRole}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {session?.user && <SignOutButton />}
      </div>
    </header>
  );
}
