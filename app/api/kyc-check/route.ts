import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BUCKET = 'kyc-documents';
const SIGNED_URL_TTL = 60 * 60; // 1 hour

// Turn a stored storage path into a short-lived signed URL the admin can open.
async function signPath(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl || null;
}

// GET /api/kyc-check?status=in_review|active|completed|all
// Lists publisher KYC submissions with the user attached + signed document URLs.
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') || 'in_review';

    let query = supabase
      .from('publisher_kyc_tasks')
      .select('*')
      .order('"submittedAt"', { ascending: false, nullsFirst: false })
      .order('"createdAt"', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const tasks = await Promise.all(
      (data || []).map(async (t: any) => {
        let user = null;
        if (t.userId) {
          const { data: u } = await supabase
            .from('users')
            .select('_id, email, "fullName"')
            .eq('_id', t.userId)
            .single();
          user = u;
        }

        // All uploaded documents for this task (append-only across review rounds),
        // each with a short-lived signed URL the admin can open in a new tab.
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
            createdAt: f.createdAt,
            url: await signPath(f.storagePath),
          }))
        );

        return { ...t, user, files };
      })
    );

    // Counts for the stat cards / filters.
    const counts: Record<string, number> = { in_review: 0, active: 0, completed: 0 };
    const { data: allRows } = await supabase.from('publisher_kyc_tasks').select('status');
    (allRows || []).forEach((r: any) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });

    return NextResponse.json({ success: true, tasks, counts });
  } catch (error: any) {
    console.error('Error fetching KYC submissions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch KYC submissions' }, { status: 500 });
  }
}
