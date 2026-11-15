import { getReportData } from "@/features/admin/server/queries";
import ClientReportsPage from "./client-reports";

export default async function AdminReportsPage() {
  const data = await getReportData();

  return <ClientReportsPage data={data} />;
}
