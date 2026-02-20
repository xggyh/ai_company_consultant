import { InsightsDashboard } from "../../../components/dashboard/insights-dashboard";
import { DashboardErrorView } from "../../../components/dashboard/dashboard-error";
import { getDashboardData } from "../../../lib/dashboard";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  try {
    const data = await getDashboardData();
    return <InsightsDashboard data={data} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return <DashboardErrorView message={message} />;
  }
}
