import { FavoritesDashboard } from "../../../components/dashboard/favorites-dashboard";
import { getDashboardData } from "../../../lib/dashboard";

export default async function FavoritesPage() {
  const data = await getDashboardData();
  return <FavoritesDashboard data={data} />;
}
