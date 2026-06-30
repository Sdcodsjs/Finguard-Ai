// Authenticated app layout — wraps all dashboard pages
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </AuthProvider>
  );
}
