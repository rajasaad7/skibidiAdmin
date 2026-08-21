import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { categorizeDomain } from '@/lib/categorization-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domainIds } = body;

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    // Fetch categories from database
    const { data: categories, error: categoriesError } = await supabase
      .from('domain_categories')
      .select('_id, name')
      .order('name');

    if (categoriesError || !categories || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Fetch domains to categorize
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('_id, "domainName", url, description')
      .in('_id', domainIds);

    if (domainsError || !domains) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch domains' },
        { status: 500 }
      );
    }

    const results = [];
    const updates = [];
    const errors = [];

    // Process each domain
    for (const domain of domains) {
      try {
        // Categorize the domain
        const result = await categorizeDomain(
          {
            domainName: domain.domainName,
            url: domain.url,
            description: domain.description,
          },
          categories
        );

        results.push(result);

        // If we got a valid category, prepare update
        if (result.categoryId) {
          const updateData: any = {
            "categoryId": result.categoryId,
          };

          // Update language if detected
          if (result.suggestedLanguage) {
            updateData.language = result.suggestedLanguage;
          }

          // Update country if detected
          if (result.suggestedCountry) {
            updateData.country = result.suggestedCountry;
          }

          // Prohibited-niche moderation flag: written on every successful run so a re-run
          // also clears a stale flag (never auto-rejects; the domains page marks it red).
          if (result.prohibitedNiche) {
            updateData.prohibitedNiche = result.prohibitedNiche;
            updateData.prohibitedNicheReason = (result.prohibitedNicheReason || '').slice(0, 500) || null;
            updateData.prohibitedNicheSource = result.prohibitedNicheSource || 'ai';
            updateData.prohibitedNicheDetectedAt = new Date().toISOString();
          } else {
            updateData.prohibitedNiche = null;
            updateData.prohibitedNicheReason = null;
            updateData.prohibitedNicheSource = null;
            updateData.prohibitedNicheDetectedAt = null;
          }

          const { error: updateError } = await supabase
            .from('domains')
            .update(updateData)
            .eq('_id', domain._id);

          if (updateError) {
            console.error(`Error updating domain ${domain.domainName}:`, updateError);
            errors.push(`Failed to update ${domain.domainName}: ${updateError.message}`);
          } else {
            updates.push(domain.domainName);
          }
        } else {
          errors.push(`Could not categorize ${domain.domainName}: ${result.reason}`);
        }

        // Longer delay to avoid rate limiting (2 seconds between requests)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`Error processing domain ${domain.domainName}:`, error);
        errors.push(`Error processing ${domain.domainName}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      updatedCount: updates.length,
      updatedDomains: updates,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in categorization API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
