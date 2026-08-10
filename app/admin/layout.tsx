import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: React.PropsWithChildren) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-background-alt border-b border-border shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-text">Panel Pengelola</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {session.user.name ?? "Admin"} (ADMIN)
            </span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}