import { MainDashboard } from "../../../components/dashboard/main-dashboard";
import { getDashboardData } from "../../../lib/dashboard";

export default async function AdvisorPage() {
  const data = await getDashboardData();
  return <MainDashboard data={data} />;
}
