import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Surplus reconciliation tab.
 *
 * GET returns:
 *  - summary: how much money we OWE (buyer balances + publisher balances)
 *    vs how much we HOLD (sum of the manual platform rows), and the net.
 *  - rows: the manually-maintained per-platform cash balances.
 *
 * Buyer Balance  = wallet balance + unclaimed refunds + active (in-flight) orders.
 * Publisher Balance = sum of publishers' available currentBalance.
 */
export async function GET() {
  try {
    // --- Buyer side -------------------------------------------------------
    const { data: walletRows, error: walletError } = await supabase
      .from('user_balances')
      .select('balance')
      .gt('balance', 0);
    if (walletError) throw walletError;

    const walletTotal = (walletRows || []).reduce(
      (sum: number, b: any) => sum + Number(b.balance || 0),
      0
    );

    // Unclaimed refunds = rejected, not-yet-refunded orders.
    const { data: rejectedOrders, error: rejectedError } = await supabase
      .from('marketplace_orders')
      .select('"totalPrice"')
      .eq('status', 'rejected')
      .is('refundedAt', null);
    if (rejectedError) throw rejectedError;

    const unclaimedRefunds = (rejectedOrders || []).reduce(
      (sum: number, o: any) => sum + Number(o.totalPrice || 0),
      0
    );

    // Active orders = money buyers committed that hasn't been released yet.
    const { data: activeOrders, error: activeError } = await supabase
      .from('marketplace_orders')
      .select('"totalPrice"')
      .in('status', ['paid', 'accepted', 'submitted', 'in_progress']);
    if (activeError) throw activeError;

    const activeOrdersTotal = (activeOrders || []).reduce(
      (sum: number, o: any) => sum + Number(o.totalPrice || 0),
      0
    );

    const buyerBalance = walletTotal + unclaimedRefunds + activeOrdersTotal;

    // --- Publisher side ---------------------------------------------------
    const { data: pubBalances, error: pubError } = await supabase
      .from('publisher_balances')
      .select('"currentBalance"')
      .gt('currentBalance', 0);
    if (pubError) throw pubError;

    const publisherBalance = (pubBalances || []).reduce(
      (sum: number, b: any) => sum + Number(b.currentBalance || 0),
      0
    );

    // --- Cash we hold (manual platform rows) ------------------------------
    const { data: rows, error: rowsError } = await supabase
      .from('account_balances')
      .select('*')
      .order('sortOrder', { ascending: true })
      .order('createdAt', { ascending: true });
    if (rowsError) throw rowsError;

    const totalInAccount = (rows || []).reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0),
      0
    );

    const totalOwed = buyerBalance + publisherBalance;
    const net = totalInAccount - totalOwed;

    return NextResponse.json({
      success: true,
      summary: {
        buyerBalance,
        publisherBalance,
        totalOwed,
        totalInAccount,
        net,
      },
      rows: rows || [],
    });
  } catch (error: any) {
    console.error('Error fetching surplus data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch surplus data' },
      { status: 500 }
    );
  }
}

// Create a new platform row.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = (body?.platform || '').trim();
    const amount = Number(body?.amount || 0);

    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'Platform name is required' },
        { status: 400 }
      );
    }

    // Place new rows at the end.
    const { data: last } = await supabase
      .from('account_balances')
      .select('"sortOrder"')
      .order('sortOrder', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (last?.sortOrder ?? -1) + 1;

    const { data, error } = await supabase
      .from('account_balances')
      .insert({ platform, amount, sortOrder })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, row: data });
  } catch (error: any) {
    console.error('Error creating account balance row:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create row' },
      { status: 500 }
    );
  }
}

// Update an existing platform row (platform name and/or amount).
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = body?._id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Row id is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (typeof body.platform === 'string') updates.platform = body.platform.trim();
    if (body.amount !== undefined) updates.amount = Number(body.amount || 0);

    const { data, error } = await supabase
      .from('account_balances')
      .update(updates)
      .eq('_id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, row: data });
  } catch (error: any) {
    console.error('Error updating account balance row:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update row' },
      { status: 500 }
    );
  }
}

// Delete a platform row.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Row id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('account_balances').delete().eq('_id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting account balance row:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete row' },
      { status: 500 }
    );
  }
}
