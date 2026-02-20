import { AdvisorWorkspace } from "../../../components/dashboard/advisor-workspace";
import { getDashboardData } from "../../../lib/dashboard";

export default async function AdvisorPage() {
  const data = await getDashboardData();
  return <AdvisorWorkspace data={data} />;
}
