import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminShell } from "@/features/admin/components/admin-shell";

export default async function AdminLayout({ children }: React.PropsWithChildren) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <AdminShell userName={session.user.name ?? "Admin"} userEmail={session.user.email ?? ""}>
      {children}
    </AdminShell>
  );
}
