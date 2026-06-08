import { supabase } from '@/lib/supabase';

// Approves all PENDING offerings (adminApproved IS NULL) whose domain has
// organicTraffic > 0. Starts from pending offerings (a small set), then checks
// traffic only for the domains those offerings belong to.
// Streams NDJSON progress events so the client can show a progress bar.
export async function POST() {
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

        // 2. Of the domains those offerings belong to, find which have traffic > 0
        send({ type: 'phase', phase: 'checking', message: 'Checking domain traffic...' });

        const uniqueDomainIds = Array.from(
          new Set(pendingOfferings.map((o) => o.domainId).filter(Boolean))
        );

        const domainsWithTraffic = new Set<string>();
        const batchSize = 100;

        for (let i = 0; i < uniqueDomainIds.length; i += batchSize) {
          const batch = uniqueDomainIds.slice(i, i + batchSize);
          const { data, error } = await supabase
            .from('domains')
            .select('_id')
            .in('_id', batch)
            .gt('"organicTraffic"', 0);

          if (error) {
            throw new Error(`Fetch domains error: ${error.message}`);
          }
          (data || []).forEach((d: any) => domainsWithTraffic.add(d._id));
        }

        // 3. Keep only pending offerings whose domain has traffic
        const offeringsToApprove = pendingOfferings.filter((o) =>
          domainsWithTraffic.has(o.domainId)
        );
        const offeringIds = offeringsToApprove.map((o) => o._id);
        const total = offeringIds.length;

        if (total === 0) {
          send({ type: 'done', count: 0, domainCount: domainsWithTraffic.size });
          controller.close();
          return;
        }

        // 4. Approve them in batches
        send({ type: 'phase', phase: 'approving', message: 'Approving offerings...', total });

        let totalApproved = 0;
        for (let i = 0; i < offeringIds.length; i += batchSize) {
          const updateBatch = offeringIds.slice(i, i + batchSize);

          const { error: updateError } = await supabase
            .from('domain_offerings')
            .update({
              adminApproved: true,
              adminRejectionReason: null,
              "updatedAt": new Date().toISOString()
            })
            .in('_id', updateBatch);

          if (updateError) {
            throw new Error(`Update error: ${updateError.message}`);
          }

          totalApproved += updateBatch.length;
          send({ type: 'progress', approved: totalApproved, total });
        }

        send({ type: 'done', count: totalApproved, domainCount: domainsWithTraffic.size });
      } catch (error: any) {
        console.error('Error approving pending offerings with traffic:', error);
        send({ type: 'error', error: error?.message || 'Failed to approve offerings' });
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
