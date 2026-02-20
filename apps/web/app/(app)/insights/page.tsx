import { InsightsDashboard } from "../../../components/dashboard/insights-dashboard";
import { getDashboardData } from "../../../lib/dashboard";

export default async function InsightsPage() {
  const data = await getDashboardData();
  return <InsightsDashboard data={data} />;
}
