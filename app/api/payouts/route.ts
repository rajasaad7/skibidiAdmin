import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const KYC_BUCKET = 'kyc-documents';
const KYC_SIGNED_URL_TTL = 60 * 60; // 1 hour

// Turn a stored KYC storage path into a short-lived signed URL the admin can open.
async function signKycPath(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(KYC_BUCKET).createSignedUrl(path, KYC_SIGNED_URL_TTL);
  return data?.signedUrl || null;
}

// Fetch the user's KYC tasks (most recent first) with their submitted documents,
// each document carrying a signed URL the admin can open from the payout modal.
async function getKycForUser(userId: string) {
  const { data: tasks } = await supabase
    .from('publisher_kyc_tasks')
    .select('_id, title, status, "taskType", "submittedCountry", "submittedDocType", "submittedDocNumber", "submittedAddress", "submittedAt", "reviewNote", "completedAt"')
    .eq('userId', userId)
    .order('"submittedAt"', { ascending: false, nullsFirst: false })
    .order('"createdAt"', { ascending: false });

  if (!tasks || tasks.length === 0) return [];

  return Promise.all(
    tasks.map(async (t: any) => {
      const { data: fileRows } = await supabase
        .from('kyc_submission_files')
        .select('_id, label, "fileName", "mimeType", round, "storagePath", "createdAt"')
        .eq('taskId', t._id)
        .order('createdAt', { ascending: true });

      const files = await Promise.all(
        (fileRows || []).map(async (f: any) => ({
          _id: f._id,
          label: f.label,
          fileName: f.fileName,
          mimeType: f.mimeType,
          round: f.round,
          url: await signKycPath(f.storagePath),
        }))
      );

      return { ...t, files };
    })
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let query = supabase
      .from('publisher_payouts')
      .select('*')
      .order('"createdAt"', { ascending: false });

    if (status === 'active') {
      // "Needs Action" — everything still open (excludes completed and failed).
      query = query.in('status', ['pending', 'processing']);
    } else if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch user data + linked payout method for each payout and calculate amountReceived
    const payoutsWithUsers = await Promise.all(
      (data || []).map(async (payout) => {
        let userData = null;
        let kycTasks: any[] = [];
        if (payout.userId) {
          const { data: user } = await supabase
            .from('users')
            .select('_id, email, "fullName", "billingInfo", "contactDetails"')
            .eq('_id', payout.userId)
            .single();
          userData = user;
          kycTasks = await getKycForUser(payout.userId);
        }

        // Fetch the saved payout method the publisher selected for this request.
        // Newer payouts reference publisher_payout_methods via payoutMethodId;
        // older ones only carry the legacy paymentDetails JSONB blob.
        let payoutMethod = null;
        if (payout.payoutMethodId) {
          const { data: method } = await supabase
            .from('publisher_payout_methods')
            .select('*')
            .eq('_id', payout.payoutMethodId)
            .single();
          payoutMethod = method;
        }

        // Calculate amountReceived if not already set
        const amount = Number(payout.amount || 0);
        const fee = Number(payout.payoutFee || 0);
        const amountReceived = payout.amountReceived ? Number(payout.amountReceived) : (amount - fee);

        return {
          ...payout,
          user: userData,
          payoutMethod,
          kycTasks,
          amountReceived: amountReceived.toFixed(2)
        };
      })
    );

    // Get stats - use amountReceived for accurate amounts
    const [totalRes, pendingRes, completedRes, failedRes] = await Promise.all([
      supabase.from('publisher_payouts').select('_id', { count: 'exact', head: true }),
      supabase.from('publisher_payouts').select('amount, "payoutFee", "amountReceived"').eq('status', 'pending'),
      supabase.from('publisher_payouts').select('amount, "payoutFee", "amountReceived"').eq('status', 'completed'),
      supabase.from('publisher_payouts').select('_id', { count: 'exact', head: true }).eq('status', 'failed')
    ]);

    // Calculate total amounts that will be/were actually paid out (amountReceived)
    const pendingAmount = (pendingRes.data || []).reduce((sum, p) => {
      const received = p.amountReceived ? Number(p.amountReceived) : (Number(p.amount || 0) - Number(p.payoutFee || 0));
      return sum + received;
    }, 0);

    const completedAmount = (completedRes.data || []).reduce((sum, p) => {
      const received = p.amountReceived ? Number(p.amountReceived) : (Number(p.amount || 0) - Number(p.payoutFee || 0));
      return sum + received;
    }, 0);

    return NextResponse.json({
      success: true,
      payouts: payoutsWithUsers,
      stats: {
        total: totalRes.count || 0,
        pendingCount: pendingRes.data?.length || 0,
        pendingAmount: pendingAmount,
        completedCount: completedRes.data?.length || 0,
        completedAmount: completedAmount,
        failed: failedRes.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
