import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Sinbyte (the current indexing provider) has no balance API, unlike the
// previous SpeedyIndex provider. The balance is therefore set manually by the
// admin whenever credits are topped up, and stored in app_settings.
const SETTING_KEY = 'sinbyte_indexer_balance';

// GET — return the manually-set Sinbyte balance.
// Response shape kept compatible with the old SpeedyIndex route
// (balance.google_indexer) so the rest of the page keeps working.
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value, "updatedAt"')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (error) throw error;

    const balance = data?.value ? parseFloat(data.value) : 0;

    return NextResponse.json({
      success: true,
      balance: {
        google_indexer: Number.isFinite(balance) ? balance : 0,
        google_checker: 0,
      },
      updatedAt: data?.updatedAt || null,
    });
  } catch (error) {
    console.error('Error fetching Sinbyte balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Sinbyte balance' },
      { status: 500 }
    );
  }
}

// POST — manually update the Sinbyte balance (called when admin tops up credits).
// Body: { balance: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const balance = Number(body?.balance);

    if (!Number.isFinite(balance) || balance < 0) {
      return NextResponse.json(
        { success: false, error: 'Balance must be a non-negative number' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: SETTING_KEY,
          value: String(balance),
          updatedAt: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select('value, "updatedAt"')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      balance: {
        google_indexer: parseFloat(data.value) || 0,
        google_checker: 0,
      },
      updatedAt: data.updatedAt,
    });
  } catch (error) {
    console.error('Error updating Sinbyte balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update Sinbyte balance' },
      { status: 500 }
    );
  }
}
