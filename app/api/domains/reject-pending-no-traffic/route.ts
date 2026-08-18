import { supabase } from '@/lib/supabase';
import { checkAuth } from '@/lib/auth';

// Rejects all PENDING offerings (adminApproved IS NULL) whose domain has
// organicTraffic exactly 0 WITH real stats backing it up: at least 2 of
// DA / DR / Spam Score must be > 0, so domains whose stats were never
// fetched (all N/A) or barely fetched are never touched. Rejection reason
// is 'No / low organic traffic' (matches COMMON_REJECTION_REASONS).
// Streams NDJSON progress events so the client can show a progress bar.
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
        // 1. Fetch all PENDING offerings (id + domainId only)
        send({ type: 'phase', phase: 'scanning', message: 'Finding pending offerings...' });

        const pendingOfferings: { _id: string; domainId: string }[] = [];
        const pageSize = 1000;
        let from = 0;

        while (true) {
          const { data, error } = await supabase
            .from('domain_offerings')
            .select('_id, "domainId"')
            .is('adminApproved', null)
            .range(from, from + pageSize - 1);

          if (error) {
            throw new Error(`Fetch pending offerings error: ${error.message}`);
          }
          if (!data || data.length === 0) break;

          pendingOfferings.push(...data.map((o: any) => ({ _id: o._id, domainId: o.domainId })));
          send({ type: 'scan', scanned: pendingOfferings.length });

          if (data.length < pageSize) break;
          from += pageSize;
        }

        if (pendingOfferings.length === 0) {
          send({ type: 'done', count: 0, domainCount: 0 });
          controller.close();
          return;
        }

        // 2. Of the domains those offerings belong to, find the ones with
        // organicTraffic = 0 (strictly 0, never N/A) AND at least 2 of
        // DA / DR / Spam Score > 0 (stats really were updated)
        send({ type: 'phase', phase: 'checking', message: 'Checking domain stats...' });

        const uniqueDomainIds = Array.from(
          new Set(pendingOfferings.map((o) => o.domainId).filter(Boolean))
        );

        const zeroTrafficDomains = new Set<string>();
        const batchSize = 100;

        for (let i = 0; i < uniqueDomainIds.length; i += batchSize) {
          const batch = uniqueDomainIds.slice(i, i + batchSize);
          const { data, error } = await supabase
            .from('domains')
            .select('_id, "organicTraffic", "domainAuthority", "domainRating", "spamScore"')
            .in('_id', batch)
            .eq('"organicTraffic"', 0);

          if (error) {
            throw new Error(`Fetch domains error: ${error.message}`);
          }
          (data || []).forEach((d: any) => {
            const statsAboveZero = [d.domainAuthority, d.domainRating, d.spamScore]
              .filter((v: any) => typeof v === 'number' && v > 0).length;
            if (statsAboveZero >= 2) {
              zeroTrafficDomains.add(d._id);
            }
          });
        }

        // 3. Keep only pending offerings on those confirmed zero-traffic domains
        const offeringsToReject = pendingOfferings.filter((o) =>
          zeroTrafficDomains.has(o.domainId)
        );
        const offeringIds = offeringsToReject.map((o) => o._id);
        const total = offeringIds.length;

        if (total === 0) {
          send({ type: 'done', count: 0, domainCount: zeroTrafficDomains.size });
          controller.close();
          return;
        }

        // 4. Reject them in batches
        send({ type: 'phase', phase: 'rejecting', message: 'Rejecting offerings...', total });

        let totalRejected = 0;
        for (let i = 0; i < offeringIds.length; i += batchSize) {
          const updateBatch = offeringIds.slice(i, i + batchSize);

          const { error: updateError } = await supabase
            .from('domain_offerings')
            .update({
              adminApproved: false,
              adminRejectionReason: 'No / low organic traffic',
              "updatedAt": new Date().toISOString()
            })
            .in('_id', updateBatch);

          if (updateError) {
            throw new Error(`Update error: ${updateError.message}`);
          }

          totalRejected += updateBatch.length;
          send({ type: 'progress', rejected: totalRejected, total });
        }

        send({ type: 'done', count: totalRejected, domainCount: zeroTrafficDomains.size });
      } catch (error: any) {
        console.error('Error rejecting pending offerings without traffic:', error);
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
