import { MainDashboard } from "../../../components/dashboard/main-dashboard";
import { DashboardErrorView } from "../../../components/dashboard/dashboard-error";
import { getDashboardData } from "../../../lib/dashboard";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  try {
    const data = await getDashboardData();
    return <MainDashboard data={data} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return <DashboardErrorView message={message} />;
  }
}
