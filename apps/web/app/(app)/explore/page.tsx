import { MainDashboard } from "../../../components/dashboard/main-dashboard";
import { getDashboardData } from "../../../lib/dashboard";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const data = await getDashboardData();
  return <MainDashboard data={data} />;
}
