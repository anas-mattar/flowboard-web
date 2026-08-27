// Minimal centered layout for signup/login — no app shell (no TopBar/workspace
// identity, since there is no session yet). No visual references exist for this screen
// (plan.md, Source of Truth II — the prototype stubs auth out); follows the existing
// shell's theme variables/styling rather than inventing a new look.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
