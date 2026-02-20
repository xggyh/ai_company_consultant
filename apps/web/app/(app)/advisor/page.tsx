import { AdvisorWorkspace } from "../../../components/dashboard/advisor-workspace";
import { DashboardErrorView } from "../../../components/dashboard/dashboard-error";
import { getDashboardData } from "../../../lib/dashboard";

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  try {
    const data = await getDashboardData();
    return <AdvisorWorkspace data={data} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return <DashboardErrorView message={message} />;
  }
}
