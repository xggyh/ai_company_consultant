import { getDataRepository } from "./data/repository";

export async function getDashboardData() {
  const repo = getDataRepository();
  return repo.getDashboardData();
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
