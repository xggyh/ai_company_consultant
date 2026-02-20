import { NextResponse } from "next/server";
import { getDataRepository } from "../../../lib/data/repository";
import type { FeedProfile } from "../../../lib/recommendations/query";

export function getPersonalizedFeed(profile: FeedProfile) {
  return {
    query: {
      industry: profile.company_industry,
      scale: profile.company_scale,
      limit: 20,
    },
    models: [],
    articles: [],
  };
}

export async function GET() {
  const repo = getDataRepository();
  const profile = await repo.getProfile();
  const feed = await repo.getFeed(profile);
  return NextResponse.json(feed);
}
