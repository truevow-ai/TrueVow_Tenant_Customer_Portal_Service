/**
 * API Route: POST /api/intake/seed
 * 
 * Seeds the database with sample leads demonstrating
 * varying completion percentages for the 75% threshold
 * 
 * MANDATORY SIGNALS (70% total - ALL 4 required for unlock):
 * - Jurisdiction: 15% (in-state)
 * - Incident Date: 15% (within statute)
 * - Liability Indicator: 20%
 * - Treatment Status: 20%
 * 
 * OPTIONAL SIGNALS (30% total - reach 75% threshold):
 * - Prior Representation: 5%
 * - Injury Severity: 15%
 * - Lost Wages: 10%
 */

import { NextRequest, NextResponse } from 'next/server';
import { tenantDb } from '@/lib/db/tenant-db';

// TODO: Get tenant_id from authenticated user's context/session
// This seed endpoint is for testing only - tenant_id should come from auth context
const getTenantId = (): string | null => null;

// Seed data with varying completion percentages
// UNLOCK: All 4 mandatory signals + score >= 75%
const SEED_DATA = [
  {
    // 15% - Only Jurisdiction - Missing 3 mandatory → NOT unlockable
    firstName: 'James',
    lastName: 'Wilson',
    phone: '+1 (813) 555-0147',
    status: 'new',
    practiceAreaCode: 'personal_injury',
    transcription: 'Caller hung up quickly after greeting.',
    responses: [
      { question_key: 'jurisdiction', response_value: 'FL', response_type: 'text' },
    ],
  },
  {
    // 50% - Has Jurisdiction + Liability + Treatment - Missing Incident Date → NOT unlockable
    firstName: 'Maria',
    lastName: 'Garcia',
    phone: '+1 (305) 555-0293',
    status: 'new',
    practiceAreaCode: 'personal_injury',
    transcription: 'Slip and fall at grocery store. Hurt her back.',
    responses: [
      { question_key: 'jurisdiction', response_value: 'FL', response_type: 'text' },
      { question_key: 'liability_description', response_value: 'slipped on wet floor at grocery store, no warning sign', response_type: 'text' },
      { question_key: 'treatment_description', response_value: 'ER visit, now seeing chiropractor', response_type: 'text' },
      { question_key: 'injury_description', response_value: 'hurt my lower back, having trouble walking', response_type: 'text' },
    ],
  },
  {
    // 70% - ALL 4 mandatory signals = 70% - Need 5% more → NOT unlockable (score < 75%)
    firstName: 'Robert',
    lastName: 'Chen',
    phone: '+1 (727) 555-0382',
    status: 'new',
    practiceAreaCode: 'personal_injury',
    transcription: 'Rear-ended at red light. Whiplash injury. Ongoing PT treatment.',
    responses: [
      { question_key: 'jurisdiction', response_value: 'FL', response_type: 'text' },
      { question_key: 'incident_date', response_value: 'two weeks ago', response_type: 'text' },
      { question_key: 'liability_description', response_value: 'I was stopped at a red light and got rear-ended', response_type: 'text' },
      { question_key: 'treatment_description', response_value: 'ER visit, now doing physical therapy twice a week', response_type: 'text' },
    ],
  },
  {
    // 75% - ALL 4 mandatory + Prior Rep (5%) → UNLOCKABLE
    firstName: 'David',
    lastName: 'Thompson',
    email: 'david.t@email.com',
    phone: '+1 (954) 555-0637',
    status: 'new',
    practiceAreaCode: 'personal_injury',
    leadScore: 72,
    transcription: 'Side-impact collision. Soft tissue injury.',
    responses: [
      { question_key: 'jurisdiction', response_value: 'FL', response_type: 'text' },
      { question_key: 'incident_date', response_value: 'one week ago', response_type: 'text' },
      { question_key: 'liability_description', response_value: 'other driver sideswiped me on the highway', response_type: 'text' },
      { question_key: 'treatment_description', response_value: 'chiropractor three times a week', response_type: 'text' },
      { question_key: 'prior_attorney', response_value: 'no', response_type: 'text' },
    ],
  },
  {
    // 90% - ALL 4 mandatory + Prior Rep + Injury → UNLOCKABLE
    firstName: 'Sarah',
    lastName: 'Martinez',
    phone: '+1 (407) 555-0419',
    status: 'qualified',
    practiceAreaCode: 'personal_injury',
    leadScore: 88,
    transcription: 'T-boned by drunk driver. Surgery scheduled. 6 weeks off work.',
    responses: [
      { question_key: 'jurisdiction', response_value: 'FL', response_type: 'text' },
      { question_key: 'incident_date', response_value: 'three weeks ago', response_type: 'text' },
      { question_key: 'liability_description', response_value: 'other driver ran a red light and hit my car, police report filed, DUI confirmed', response_type: 'text' },
      { question_key: 'treatment_description', response_value: 'ER surgery scheduled for herniated disc next week', response_type: 'text' },
      { question_key: 'prior_attorney', response_value: 'no, first time', response_type: 'text' },
      { question_key: 'injury_description', response_value: 'herniated disc, severe back pain requiring surgery', response_type: 'text' },
    ],
  },
  {
    // 100% - ALL 4 mandatory + all optional → UNLOCKABLE
    firstName: 'Michael',
    lastName: 'Richardson',
    phone: '+1 (904) 555-0528',
    status: 'qualified',
    practiceAreaCode: 'personal_injury',
    leadScore: 95,
    transcription: 'Hit by 18-wheeler on I-95. Multiple surgeries. Out of work 3 months.',
    responses: [
      { question_key: 'jurisdiction', response_value: 'FL', response_type: 'text' },
      { question_key: 'incident_date', response_value: 'last month', response_type: 'text' },
      { question_key: 'liability_description', response_value: 'truck driver fell asleep and crossed into my lane, witness confirmed', response_type: 'text' },
      { question_key: 'treatment_description', response_value: 'multiple surgeries, ongoing physical therapy, seeing pain management specialist', response_type: 'text' },
      { question_key: 'prior_attorney', response_value: 'no, this is my first time speaking with an attorney', response_type: 'text' },
      { question_key: 'injury_description', response_value: 'broken ribs, collapsed lung, severe whiplash, traumatic brain injury', response_type: 'text' },
      { question_key: 'lost_wages', response_value: 'yes, 3 months and counting', response_type: 'text' },
    ],
  },
  {
    // 100% - Complete intake, already converted (archived example)
    firstName: 'Jennifer',
    lastName: 'Williams',
    email: 'jennifer.w@email.com',
    phone: '+1 (561) 555-0294',
    status: 'converted',
    practiceAreaCode: 'personal_injury',
    leadScore: 85,
    transcription: 'Dog bite case. Required reconstructive surgery.',
    responses: [
      { question_key: 'jurisdiction', response_value: 'FL', response_type: 'text' },
      { question_key: 'incident_date', response_value: 'three weeks ago', response_type: 'text' },
      { question_key: 'liability_description', response_value: 'neighbor\'s dog attacked me unprovoked', response_type: 'text' },
      { question_key: 'treatment_description', response_value: 'ER visit, reconstructive surgery scheduled', response_type: 'text' },
      { question_key: 'prior_attorney', response_value: 'no', response_type: 'text' },
      { question_key: 'injury_description', response_value: 'facial lacerations requiring plastic surgery', response_type: 'text' },
      { question_key: 'lost_wages', response_value: 'no', response_type: 'text' },
    ],
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Require tenant_id in request body - no default fallback
    const tenantId = body.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required in request body' },
        { status: 400 }
      );
    }
    
    const clearExisting = body.clear_existing !== false; // Default to true

    console.log(`Seeding leads for tenant: ${tenantId}`);

    // Clear existing leads if requested
    if (clearExisting) {
      console.log('Clearing existing leads...');
      await tenantDb.clearLeadsForTenant(tenantId);
    }

    // Seed new leads
    const results = [];
    for (const seed of SEED_DATA) {
      const result = await tenantDb.createLeadWithResponses({
        tenantId,
        firstName: seed.firstName,
        lastName: seed.lastName,
        email: seed.email,
        phone: seed.phone,
        status: seed.status,
        practiceAreaCode: seed.practiceAreaCode,
        leadScore: seed.leadScore,
        transcription: seed.transcription,
        responses: seed.responses,
      });

      if (result) {
        results.push({
          firstName: seed.firstName,
          lastName: seed.lastName,
          leadId: result.leadId,
          responseCount: seed.responses.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.length} leads`,
      leads: results,
    });
  } catch (error) {
    console.error('Error seeding leads:', error);
    return NextResponse.json(
      { error: 'Failed to seed leads', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Require tenant_id in request body - no default fallback
    const tenantId = body.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required in request body' },
        { status: 400 }
      );
    }

    console.log(`Clearing leads for tenant: ${tenantId}`);
    
    const success = await tenantDb.clearLeadsForTenant(tenantId);

    return NextResponse.json({
      success,
      message: success ? 'Leads cleared' : 'Failed to clear leads',
    });
  } catch (error) {
    console.error('Error clearing leads:', error);
    return NextResponse.json(
      { error: 'Failed to clear leads', details: String(error) },
      { status: 500 }
    );
  }
}
