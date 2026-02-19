import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { domainId, offeringIndex, offering } = await request.json();

    // Get offerings for this domain
    const { data: offerings, error: fetchError } = await supabase
      .from('domain_offerings')
      .select('_id')
      .eq('"domainId"', domainId)
      .order('"createdAt"', { ascending: true });

    if (fetchError || !offerings) {
      throw new Error('Domain offerings not found');
    }

    if (offeringIndex >= offerings.length) {
      throw new Error('Invalid offering index');
    }

    // Update the specific offering in domain_offerings table
    const offeringId = offerings[offeringIndex]._id;

    // Build update object with proper camelCase column names
    const updateData: any = {
      "updatedAt": new Date().toISOString()
    };

    // Map offering fields to database columns
    if (offering.domainType !== undefined) updateData.domainType = offering.domainType;
    if (offering.guestPostEnabled !== undefined) updateData.guestPostEnabled = offering.guestPostEnabled;
    if (offering.linkInsertionEnabled !== undefined) updateData.linkInsertionEnabled = offering.linkInsertionEnabled;
    if (offering.contentWritingEnabled !== undefined) updateData.contentWritingEnabled = offering.contentWritingEnabled;
    if (offering.guestPostPrice !== undefined) updateData.guestPostPrice = offering.guestPostPrice;
    if (offering.linkInsertionPrice !== undefined) updateData.linkInsertionPrice = offering.linkInsertionPrice;
    if (offering.contentWritingIncluded !== undefined) updateData.contentWritingIncluded = offering.contentWritingIncluded;
    if (offering.contentWritingPrice !== undefined) updateData.contentWritingPrice = offering.contentWritingPrice;
    if (offering.minWordCount !== undefined) updateData.minWordCount = offering.minWordCount;
    if (offering.maxWordCount !== undefined) updateData.maxWordCount = offering.maxWordCount;
    if (offering.turnaroundTimeDays !== undefined) updateData.turnaroundTimeDays = offering.turnaroundTimeDays;
    if (offering.contentRequirements !== undefined) updateData.contentRequirements = offering.contentRequirements;
    if (offering.prohibitedNiches !== undefined) updateData.prohibitedNiches = offering.prohibitedNiches;
    if (offering.allowedLinkTypes !== undefined) updateData.allowedLinkTypes = offering.allowedLinkTypes;
    if (offering.maxOutboundLinks !== undefined) updateData.maxOutboundLinks = offering.maxOutboundLinks;
    if (offering.examplePosts !== undefined) updateData.examplePosts = offering.examplePosts;
    if (offering.isActive !== undefined) updateData.isActive = offering.isActive;
    if (offering.adminApproved !== undefined) updateData.adminApproved = offering.adminApproved;
    if (offering.adminRejectionReason !== undefined) updateData.adminRejectionReason = offering.adminRejectionReason;

    const { error: updateError } = await supabase
      .from('domain_offerings')
      .update(updateData)
      .eq('_id', offeringId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating offering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update offering' },
      { status: 500 }
    );
  }
}
