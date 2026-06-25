import { supabase } from '@/lib/supabase';

export interface ReferredUser {
  _id: string;
  fullName: string | null;
  email: string;
  createdAt: string;
  isEmailVerified: boolean;
}

export interface AffiliateStats {
  total: number;
  verified: number;
  today: number;
  last7Days: number;
  last30Days: number;
  byMonth: { month: string; count: number }[];
}

// Attribution key = users.UTM->>'utm_source', matched case-insensitively against
// the affiliate's utmSource (the value partners put in their share links, e.g.
// ?utm_source=Yash). Matching is centralized in SQL functions to avoid relying
// on PostgREST JSON-path filter quirks.

export async function getReferredUsers(
  utmSource: string,
  opts: { page?: number; limit?: number } = {}
): Promise<{ users: ReferredUser[]; total: number }> {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 50;
  const offset = (page - 1) * limit;

  const [rowsRes, allRes] = await Promise.all([
    supabase.rpc('affiliate_referred_users', {
      p_utm_source: utmSource,
      p_limit: limit,
      p_offset: offset,
    }),
    // total count for pagination
    supabase.rpc('affiliate_referral_rows', { p_utm_source: utmSource }),
  ]);

  if (rowsRes.error) throw rowsRes.error;
  if (allRes.error) throw allRes.error;

  return {
    users: (rowsRes.data || []) as ReferredUser[],
    total: (allRes.data || []).length,
  };
}

export async function getAffiliateStats(utmSource: string): Promise<AffiliateStats> {
  const { data, error } = await supabase.rpc('affiliate_referral_rows', {
    p_utm_source: utmSource,
  });
  if (error) throw error;
  const rows = (data || []) as { createdAt: string; isEmailVerified: boolean }[];

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;

  const stats: AffiliateStats = {
    total: rows.length,
    verified: 0,
    today: 0,
    last7Days: 0,
    last30Days: 0,
    byMonth: [],
  };

  const monthMap = new Map<string, number>();

  for (const r of rows) {
    const t = new Date(r.createdAt).getTime();
    if (r.isEmailVerified) stats.verified++;
    if (t >= startOfToday.getTime()) stats.today++;
    if (now - t <= 7 * day) stats.last7Days++;
    if (now - t <= 30 * day) stats.last30Days++;

    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  }

  stats.byMonth = Array.from(monthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  return stats;
}
