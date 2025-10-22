import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      newUsersRes,
      newDomainsRes,
      newOrdersRes,
      activeUsersRes,
      newLinksRes,
      newKeywordsRes,
      newProjectsRes,
      completedOrdersRes,
      newMarketplaceOrdersRes,
      totalUsersRes,
      totalDomainsRes,
      totalLinksRes,
      totalKeywordsRes,
    ] = await Promise.all([
      // New users today
      supabase.from('users').select('_id, fullName, email, createdAt').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // New domains today
      supabase.from('domains').select('_id, domainName, verificationStatus, createdAt, users!inner(fullName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // New subscription orders today
      supabase.from('orders').select('_id, planName, status, unitPrice, currency, createdAt, users!inner(fullName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // Users active today (last active today)
      supabase.from('users').select('_id, fullName, email, lastActive').gte('lastActive', todayISO).order('lastActive', { ascending: false }),

      // New links today
      supabase.from('links').select('_id, url, createdAt, users!inner(fullName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // New keywords today
      supabase.from('keywords').select('_id, keyword, createdAt, users!inner(fullName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // New projects today
      supabase.from('projects').select('_id, name, createdAt').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // Completed orders today
      supabase.from('orders').select('_id, planName, status, updatedAt, users!inner(fullName)').gte('updatedAt', todayISO).eq('status', 'completed').order('updatedAt', { ascending: false }),

      // New marketplace orders today
      supabase.from('marketplace_orders').select('_id, totalPrice, status, createdAt, domains(domainName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // Totals for comparison
      supabase.from('users').select('_id', { count: 'exact', head: true }),
      supabase.from('domains').select('_id', { count: 'exact', head: true }),
      supabase.from('links').select('_id', { count: 'exact', head: true }),
      supabase.from('keywords').select('_id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      success: true,
      activity: {
        newUsers: {
          count: newUsersRes.data?.length || 0,
          data: newUsersRes.data || []
        },
        newDomains: {
          count: newDomainsRes.data?.length || 0,
          data: newDomainsRes.data || []
        },
        newOrders: {
          count: newOrdersRes.data?.length || 0,
          data: newOrdersRes.data || []
        },
        activeUsers: {
          count: activeUsersRes.data?.length || 0,
          data: activeUsersRes.data || []
        },
        newLinks: {
          count: newLinksRes.data?.length || 0,
          data: newLinksRes.data || []
        },
        newKeywords: {
          count: newKeywordsRes.data?.length || 0,
          data: newKeywordsRes.data || []
        },
        newProjects: {
          count: newProjectsRes.data?.length || 0,
          data: newProjectsRes.data || []
        },
        completedOrders: {
          count: completedOrdersRes.data?.length || 0,
          data: completedOrdersRes.data || []
        },
        newMarketplaceOrders: {
          count: newMarketplaceOrdersRes.data?.length || 0,
          data: newMarketplaceOrdersRes.data || []
        },
        totals: {
          users: totalUsersRes.count || 0,
          domains: totalDomainsRes.count || 0,
          links: totalLinksRes.count || 0,
          keywords: totalKeywordsRes.count || 0,
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching today\'s activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today\'s activity' },
      { status: 500 }
    );
  }
}
