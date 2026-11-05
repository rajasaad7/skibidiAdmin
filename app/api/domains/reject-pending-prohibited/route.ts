import { supabase } from '@/lib/supabase';
import { checkAuth } from '@/lib/auth';

// Rejects all PENDING offerings (adminApproved IS NULL) whose domain carries
// the prohibited-niche moderation flag (domains."prohibitedNiche" IS NOT NULL,
// set by the keyword screen / AI categorizer, never auto-rejected until an
// admin runs this sweep). Rejection reason is 'Irrelevant or prohibited niche'
// (matches COMMON_REJECTION_REASONS). Streams NDJSON progress events so the
// client can show a progress bar, same protocol as reject-pending-no-traffic.
export async function POST() {
  if (!(await checkAuth())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };

      try {
        // 1. Fetch every flagged domain id (partial index idx_domains_prohibited_niche)
        send({ type: 'phase', phase: 'scanning', message: 'Finding prohibited-niche domains...' });

        const flaggedDomainIds: string[] = [];
        const pageSize = 1000;
        let from = 0;

        while (true) {
          const { data, error } = await supabase
            .from('domains')
            .select('_id')
            .not('prohibitedNiche', 'is', null)
            .range(from, from + pageSize - 1);

          if (error) {
            throw new Error(`Fetch flagged domains error: ${error.message}`);
          }
          if (!data || data.length === 0) break;

          flaggedDomainIds.push(...data.map((d: any) => d._id));
          send({ type: 'scan', scanned: flaggedDomainIds.length });

          if (data.length < pageSize) break;
          from += pageSize;
        }

        if (flaggedDomainIds.length === 0) {
          send({ type: 'done', count: 0, domainCount: 0 });
          controller.close();
          return;
        }

        // 2. Pending offerings on those domains
        send({ type: 'phase', phase: 'checking', message: 'Finding pending offerings...' });

        const offeringIds: string[] = [];
        const domainsWithPending = new Set<string>();
        const batchSize = 100;

        for (let i = 0; i < flaggedDomainIds.length; i += batchSize) {
          const batch = flaggedDomainIds.slice(i, i + batchSize);
          const { data, error } = await supabase
            .from('domain_offerings')
            .select('_id, "domainId"')
            .is('adminApproved', null)
            .in('domainId', batch);

          if (error) {
            throw new Error(`Fetch pending offerings error: ${error.message}`);
          }
          (data || []).forEach((o: any) => {
            offeringIds.push(o._id);
            if (o.domainId) domainsWithPending.add(o.domainId);
          });
        }

        const total = offeringIds.length;
        if (total === 0) {
          send({ type: 'done', count: 0, domainCount: 0 });
          controller.close();
          return;
        }

        // 3. Reject them in batches
        send({ type: 'phase', phase: 'rejecting', message: 'Rejecting offerings...', total });

        let totalRejected = 0;
        for (let i = 0; i < offeringIds.length; i += batchSize) {
          const updateBatch = offeringIds.slice(i, i + batchSize);

          const { error: updateError } = await supabase
            .from('domain_offerings')
            .update({
              adminApproved: false,
              adminRejectionReason: 'Irrelevant or prohibited niche',
              "updatedAt": new Date().toISOString()
            })
            .in('_id', updateBatch);

          if (updateError) {
            throw new Error(`Update error: ${updateError.message}`);
          }

          totalRejected += updateBatch.length;
          send({ type: 'progress', rejected: totalRejected, total });
        }

        send({ type: 'done', count: totalRejected, domainCount: domainsWithPending.size });
      } catch (error: any) {
        console.error('Error rejecting pending prohibited-niche offerings:', error);
        send({ type: 'error', error: error?.message || 'Failed to reject offerings' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform'
    }
  });
}
