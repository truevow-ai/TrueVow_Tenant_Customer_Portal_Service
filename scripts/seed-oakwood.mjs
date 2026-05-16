/**
 * Seed script for Oakwood Law Firm test data
 * 
 * Run with: node scripts/seed-oakwood.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://flhnyyreaxkmwmexchla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaG55eXJlYXhrbXdtZXhjaGxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1MDQ2MSwiZXhwIjoyMDc4MDI2NDYxfQ.utZz3cLjh2A7AMSXpwJjfAvy-GA8mXTBUfzb11sckBo';

const TENANT_ID = 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f';

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Seed data with ACTUAL Benjamin intake question keys and response codes
// Status logic: Benjamin (AI) can only set 'new' or 'contacted'
// 'qualified'/'scheduled'/'lost' require human attorney action
//
// QUESTION KEY FORMAT: {PRACTICE_AREA}_Q{NUMBER}_{NAME}
// - CA = Car Accident
// - SF = Slip & Fall
// - DB = Dog Bite
// - WI = Workplace Injury
// - OPI = Other Personal Injury
//
// RESPONSE FORMAT: Numeric codes ("1", "2", "3") for multiple choice
// This matches the actual Benjamin voice chatbot intake flow
const SEED_DATA = [
  {
    firstName: 'James',
    lastName: 'Wilson',
    phone: '+1 (813) 555-0147',
    status: 'new', // Hung up quickly - minimal info
    practiceAreaCode: 'CAR_ACCIDENT',
    transcription: 'Caller hung up quickly after greeting.',
    responses: [
      // Only answered Q1 before hanging up
      { question_key: 'CA_Q01_JURISDICTION', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, in Florida
    ],
  },
  {
    firstName: 'Maria',
    lastName: 'Garcia',
    phone: '+1 (305) 555-0293',
    status: 'new', // Call completed, awaiting review
    practiceAreaCode: 'SLIP_FALL',
    transcription: 'Slip and fall at grocery store. Hurt her back.',
    responses: [
      { question_key: 'SF_Q01_JURISDICTION', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, in Florida
      { question_key: 'SF_Q02_WHEN_OCCURRED', response_value: '3', response_type: 'multiple_choice' }, // 3 = Within month
      { question_key: 'SF_Q04_HAZARD_CONDITION', response_value: '1', response_type: 'multiple_choice' }, // 1 = Wet floor
      { question_key: 'SF_Q06_PROPERTY_OWNER_AWARENESS', response_value: '2', response_type: 'multiple_choice' }, // 2 = Should have known
      { question_key: 'SF_Q10_MEDICAL_TREATMENT', response_value: '2', response_type: 'multiple_choice' }, // 2 = ER + follow-up
    ],
  },
  {
    firstName: 'Robert',
    lastName: 'Chen',
    phone: '+1 (727) 555-0382',
    status: 'scheduled', // Consultation booked with attorney
    practiceAreaCode: 'CAR_ACCIDENT',
    transcription: 'Rear-ended at red light. Whiplash injury. Ongoing PT treatment.',
    // Booking: Tomorrow at 10:00 AM
    bookingDate: getBookingDate(1, 10, 0),
    responses: [
      { question_key: 'CA_Q01_JURISDICTION', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, in Florida
      { question_key: 'CA_Q02_WHEN_OCCURRED', response_value: '2', response_type: 'multiple_choice' }, // 2 = Within week
      { question_key: 'CA_Q03_ACCIDENT_TYPE', response_value: '1', response_type: 'multiple_choice' }, // 1 = Rear-end collision
      { question_key: 'CA_Q04_AT_FAULT', response_value: '1', response_type: 'multiple_choice' }, // 1 = Other driver at fault
      { question_key: 'CA_Q06_MEDICAL_TREATMENT', response_value: '3', response_type: 'multiple_choice' }, // 3 = ER + ongoing PT
      { question_key: 'CA_Q07_CITATION', response_value: '2', response_type: 'multiple_choice' }, // 2 = Other driver cited
      { question_key: 'CONFLICT_Q01_PRIOR_REP', response_value: '1', response_type: 'multiple_choice' }, // 1 = No prior attorney
    ],
  },
  {
    firstName: 'David',
    lastName: 'Thompson',
    email: 'david.t@email.com',
    phone: '+1 (954) 555-0637',
    status: 'scheduled', // Consultation booked
    practiceAreaCode: 'CAR_ACCIDENT',
    leadScore: 72,
    transcription: 'Side-impact collision. Soft tissue injury.',
    // Booking: Tomorrow at 2:00 PM
    bookingDate: getBookingDate(1, 14, 0),
    responses: [
      { question_key: 'CA_Q01_JURISDICTION', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, in Florida
      { question_key: 'CA_Q02_WHEN_OCCURRED', response_value: '2', response_type: 'multiple_choice' }, // 2 = Within week
      { question_key: 'CA_Q03_ACCIDENT_TYPE', response_value: '3', response_type: 'multiple_choice' }, // 3 = Side-impact
      { question_key: 'CA_Q04_AT_FAULT', response_value: '1', response_type: 'multiple_choice' }, // 1 = Other driver at fault
      { question_key: 'CA_Q06_MEDICAL_TREATMENT', response_value: '4', response_type: 'multiple_choice' }, // 4 = Chiropractor only
      { question_key: 'CA_Q08_WITNESSES', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, witness present (liability ✓)
      { question_key: 'CONFLICT_Q01_PRIOR_REP', response_value: '1', response_type: 'multiple_choice' }, // 1 = No prior attorney
    ],
  },
  {
    firstName: 'Sarah',
    lastName: 'Martinez',
    phone: '+1 (407) 555-0419',
    status: 'scheduled', // High-value case, consultation scheduled
    practiceAreaCode: 'CAR_ACCIDENT',
    leadScore: 88,
    transcription: 'T-boned by drunk driver. Surgery scheduled. 6 weeks off work.',
    // Booking: Day after tomorrow at 11:00 AM
    bookingDate: getBookingDate(2, 11, 0),
    responses: [
      { question_key: 'CA_Q01_JURISDICTION', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, in Florida
      { question_key: 'CA_Q02_WHEN_OCCURRED', response_value: '3', response_type: 'multiple_choice' }, // 3 = Within month
      { question_key: 'CA_Q03_ACCIDENT_TYPE', response_value: '2', response_type: 'multiple_choice' }, // 2 = T-bone
      { question_key: 'CA_Q04_AT_FAULT', response_value: '1', response_type: 'multiple_choice' }, // 1 = Other driver at fault
      { question_key: 'CA_Q05_INJURY_DESCRIPTION', response_value: '2', response_type: 'multiple_choice' }, // 2 = Herniated disc
      { question_key: 'CA_Q06_MEDICAL_TREATMENT', response_value: '5', response_type: 'multiple_choice' }, // 5 = Surgery scheduled
      { question_key: 'CA_Q07_CITATION', response_value: '2', response_type: 'multiple_choice' }, // 2 = Other driver cited (DUI)
      { question_key: 'CA_Q08_WITNESSES', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, witness available
      { question_key: 'CA_Q09_LOST_WAGES', response_value: '3', response_type: 'multiple_choice' }, // 3 = 1+ months missed
      { question_key: 'CONFLICT_Q01_PRIOR_REP', response_value: '1', response_type: 'multiple_choice' }, // 1 = No prior attorney
    ],
  },
  {
    firstName: 'Michael',
    lastName: 'Richardson',
    phone: '+1 (904) 555-0528',
    status: 'scheduled', // High-value case, urgent consultation
    practiceAreaCode: 'CAR_ACCIDENT',
    leadScore: 95,
    transcription: 'Hit by 18-wheeler on I-95. Multiple surgeries. Out of work 3 months.',
    // Booking: Next Monday at 9:00 AM
    bookingDate: getBookingDate(8, 9, 0),
    responses: [
      { question_key: 'CA_Q01_JURISDICTION', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, in Florida
      { question_key: 'CA_Q02_WHEN_OCCURRED', response_value: '4', response_type: 'multiple_choice' }, // 4 = 1-3 months ago
      { question_key: 'CA_Q02B_TIMING_FOLLOWUP', response_value: '2', response_type: 'multiple_choice' }, // 2 = 3-6 months
      { question_key: 'CA_Q03_ACCIDENT_TYPE', response_value: '5', response_type: 'multiple_choice' }, // 5 = Commercial vehicle
      { question_key: 'CA_Q04_AT_FAULT', response_value: '1', response_type: 'multiple_choice' }, // 1 = Other driver at fault
      { question_key: 'CA_Q05_INJURY_DESCRIPTION', response_value: '3', response_type: 'multiple_choice' }, // 3 = Multiple severe injuries
      { question_key: 'CA_Q06_MEDICAL_TREATMENT', response_value: '6', response_type: 'multiple_choice' }, // 6 = Multiple surgeries
      { question_key: 'CA_Q07_CITATION', response_value: '2', response_type: 'multiple_choice' }, // 2 = Other driver cited
      { question_key: 'CA_Q08_WITNESSES', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, witness available
      { question_key: 'CA_Q09_LOST_WAGES', response_value: '4', response_type: 'multiple_choice' }, // 4 = Lost job/can't work
      { question_key: 'CONFLICT_Q01_PRIOR_REP', response_value: '1', response_type: 'multiple_choice' }, // 1 = No prior attorney
    ],
  },
  {
    firstName: 'Jennifer',
    lastName: 'Williams',
    email: 'jennifer.w@email.com',
    phone: '+1 (561) 555-0294',
    status: 'scheduled', // Good case, consultation booked
    practiceAreaCode: 'DOG_BITE',
    leadScore: 85,
    transcription: 'Dog bite case. Required reconstructive surgery.',
    // Booking: Next Tuesday at 3:00 PM
    bookingDate: getBookingDate(9, 15, 0),
    responses: [
      { question_key: 'DB_Q01_JURISDICTION', response_value: '1', response_type: 'multiple_choice' }, // 1 = Yes, in Florida
      { question_key: 'DB_Q02_WHEN_OCCURRED', response_value: '3', response_type: 'multiple_choice' }, // 3 = Within month
      { question_key: 'DB_Q03_DOG_OWNER', response_value: '1', response_type: 'multiple_choice' }, // 1 = Neighbor's dog
      { question_key: 'DB_Q04_INJURY_DESCRIPTION', response_value: '3', response_type: 'multiple_choice' }, // 3 = Severe (surgery required)
      { question_key: 'DB_Q05_PROVOCATION', response_value: '1', response_type: 'multiple_choice' }, // 1 = No provocation
      { question_key: 'DB_Q07_MEDICAL_TREATMENT', response_value: '5', response_type: 'multiple_choice' }, // 5 = Surgery scheduled
      { question_key: 'CONFLICT_Q01_PRIOR_REP', response_value: '1', response_type: 'multiple_choice' }, // 1 = No prior attorney
    ],
  },
];

/**
 * Helper to generate booking dates relative to today
 * @param {number} daysFromNow - Number of days from now (0 = today)
 * @param {number} hour - Hour in 24h format (0-23)
 * @param {number} minute - Minute (0-59)
 */
function getBookingDate(daysFromNow, hour, minute) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

async function createLeadWithResponses(seed) {
  const leadId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create lead
  const { error: leadError } = await client.from('leads').insert({
    lead_id: leadId,
    tenant_id: TENANT_ID,
    first_name: seed.firstName,
    last_name: seed.lastName || null,
    email: seed.email || null,
    phone: seed.phone,
    status: seed.status,
    practice_area_code: seed.practiceAreaCode || null,
    lead_score: seed.leadScore || null,
    booking_date: seed.bookingDate || null, // Consultation date/time set by Benjamin
    session_id: null,
    created_at: now,
    updated_at: now,
  });

  if (leadError) {
    console.error(`Error creating lead ${seed.firstName}:`, leadError);
    return null;
  }

  // Create session
  const { error: sessionError } = await client.from('intake_sessions').insert({
    session_id: sessionId,
    tenant_id: TENANT_ID,
    lead_id: leadId,
    twilio_call_sid: `SEED-${sessionId.slice(0, 8)}`,
    started_at: now,
  });

  if (sessionError) {
    console.error(`Error creating session for ${seed.firstName}:`, sessionError);
  } else {
    // Update lead with session_id
    await client.from('leads').update({ session_id: sessionId }).eq('lead_id', leadId);
  }

  // Create transcription
  if (seed.transcription) {
    await client.from('call_transcriptions').insert({
      transcription_id: crypto.randomUUID(),
      call_sid: `SEED-${sessionId.slice(0, 8)}`,
      session_id: sessionId,
      transcription_text: seed.transcription,
      status: 'completed',
      language_code: 'en-US',
    });
  }

  // Create responses
  if (seed.responses.length > 0) {
    const responseRecords = seed.responses.map((r) => ({
      response_id: crypto.randomUUID(),
      session_id: sessionId,
      question_key: r.question_key,
      response_value: r.response_value,
      response_type: r.response_type,
      captured_at: now,
      state_name: 'completed',
    }));

    const { error: responsesError } = await client.from('intake_responses').insert(responseRecords);
    if (responsesError) {
      console.error(`Error creating responses for ${seed.firstName}:`, responsesError);
    }
  }

  return { leadId, sessionId };
}

async function clearExistingData() {
  console.log('Clearing existing data for tenant...');
  
  // First, get count of existing records
  const { count: leadCount } = await client
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);
  
  const { count: sessionCount } = await client
    .from('intake_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);
  
  console.log(`  Found ${leadCount || 0} leads, ${sessionCount || 0} sessions to delete`);
  
  // STEP 1: Break circular FK constraints by setting FK columns to NULL
  // leads.session_id -> intake_sessions.session_id
  // intake_sessions.lead_id -> leads.lead_id
  console.log('  Breaking circular FK constraints...');
  
  // Set leads.session_id to NULL for this tenant
  const { error: nullSessionErr } = await client
    .from('leads')
    .update({ session_id: null })
    .eq('tenant_id', TENANT_ID);
  
  if (nullSessionErr) {
    console.error('  Error nulling leads.session_id:', nullSessionErr.message);
  }
  
  // Set intake_sessions.lead_id to NULL for this tenant
  const { error: nullLeadErr } = await client
    .from('intake_sessions')
    .update({ lead_id: null })
    .eq('tenant_id', TENANT_ID);
  
  if (nullLeadErr) {
    console.error('  Error nulling intake_sessions.lead_id:', nullLeadErr.message);
  }
  
  // STEP 2: Get all session IDs and delete dependent records
  const { data: allSessions } = await client
    .from('intake_sessions')
    .select('session_id')
    .eq('tenant_id', TENANT_ID);
  
  if (allSessions && allSessions.length > 0) {
    const sessionIds = allSessions.map(s => s.session_id);
    console.log(`  Deleting responses for ${sessionIds.length} sessions...`);
    
    // Delete in chunks of 50 to avoid URL length limits
    for (let i = 0; i < sessionIds.length; i += 50) {
      const chunk = sessionIds.slice(i, i + 50);
      const { error: respErr } = await client.from('intake_responses').delete().in('session_id', chunk);
      if (respErr) console.error('  Error deleting responses:', respErr.message);
      
      const { error: transErr } = await client.from('call_transcriptions').delete().in('session_id', chunk);
      if (transErr) console.error('  Error deleting transcriptions:', transErr.message);
      
      const { error: recErr } = await client.from('call_recordings').delete().in('session_id', chunk);
      if (recErr) console.error('  Error deleting recordings:', recErr.message);
    }
  }
  
  // STEP 3: Delete all sessions for this tenant (now safe, no FK references)
  const { error: sessionDelErr } = await client
    .from('intake_sessions')
    .delete()
    .eq('tenant_id', TENANT_ID);
  
  if (sessionDelErr) {
    console.error('  Error deleting sessions:', sessionDelErr.message);
  } else {
    console.log(`  Deleted all sessions`);
  }
  
  // STEP 4: Delete all leads for this tenant (now safe, no FK references)
  const { error: leadDelErr } = await client
    .from('leads')
    .delete()
    .eq('tenant_id', TENANT_ID);
  
  if (leadDelErr) {
    console.error('  Error deleting leads:', leadDelErr.message);
  } else {
    console.log(`  Deleted all leads`);
  }
  
  // Verify deletion
  const { count: remainingLeads } = await client
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);
  
  if (remainingLeads && remainingLeads > 0) {
    console.error(`  WARNING: ${remainingLeads} leads still remain after cleanup!`);
    return false;
  } else {
    console.log('Existing data cleared successfully.');
    return true;
  }
}

async function main() {
  console.log('Seeding Oakwood Law Firm test data...');
  console.log(`Tenant ID: ${TENANT_ID}`);
  
  // Clear existing data
  await clearExistingData();
  
  // Seed new data
  const results = [];
  for (const seed of SEED_DATA) {
    const result = await createLeadWithResponses(seed);
    if (result) {
      results.push({ firstName: seed.firstName, lastName: seed.lastName, ...result });
      console.log(`Created: ${seed.firstName} ${seed.lastName}`);
    }
  }
  
  console.log(`\nSeeded ${results.length} leads successfully!`);
  
  // Verify
  const { data: leads } = await client.from('leads').select('first_name, last_name, status, booking_date').eq('tenant_id', TENANT_ID);
  console.log('\nVerification - Leads in database:');
  leads?.forEach(l => {
    const booking = l.booking_date ? new Date(l.booking_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'No booking';
    console.log(`  - ${l.first_name} ${l.last_name} (${l.status})${l.status === 'scheduled' ? ` → ${booking}` : ''}`);
  });
}

main().catch(console.error);
