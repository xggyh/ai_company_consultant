import { InsightsDashboard } from "../../../components/dashboard/insights-dashboard";
import { getDashboardData } from "../../../lib/dashboard";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const data = await getDashboardData();
  return <InsightsDashboard data={data} />;
}
