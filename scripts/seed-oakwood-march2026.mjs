/**
 * Seed: Oakwood Law Firm — March 2026 test leads
 * 30 realistic prospects across multiple practice areas and statuses.
 * Dates spread through March 1–6, 2026 for UX testing of filters / flows.
 *
 * Run with: node scripts/seed-oakwood-march2026.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://flhnyyreaxkmwmexchla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaG55eXJlYXhrbXdtZXhjaGxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1MDQ2MSwiZXhwIjoyMDc4MDI2NDYxfQ.utZz3cLjh2A7AMSXpwJjfAvy-GA8mXTBUfzb11sckBo';
const TENANT_ID = 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f';

const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// March 2026 dates spread across the month
const MARCH_DATES = [
  '2026-03-01T08:15:00Z', '2026-03-01T11:30:00Z', '2026-03-01T14:45:00Z',
  '2026-03-02T09:00:00Z', '2026-03-02T13:20:00Z', '2026-03-02T16:10:00Z',
  '2026-03-03T08:45:00Z', '2026-03-03T10:30:00Z', '2026-03-03T15:00:00Z',
  '2026-03-04T09:15:00Z', '2026-03-04T12:00:00Z', '2026-03-04T17:00:00Z',
  '2026-03-05T08:00:00Z', '2026-03-05T11:00:00Z', '2026-03-05T14:30:00Z',
  '2026-03-05T16:45:00Z', '2026-03-06T09:30:00Z', '2026-03-06T11:15:00Z',
  '2026-03-06T13:45:00Z', '2026-03-06T15:30:00Z', '2026-03-06T17:30:00Z',
  '2026-03-06T18:00:00Z', '2026-03-06T18:30:00Z', '2026-03-06T19:00:00Z',
  '2026-03-06T19:15:00Z', '2026-03-06T19:30:00Z', '2026-03-06T19:45:00Z',
  '2026-03-06T20:00:00Z', '2026-03-06T20:15:00Z', '2026-03-06T20:30:00Z',
];

const LEADS = [
  // --- CAR ACCIDENT leads ---
  { first: 'Marcus', last: 'Johnson',  phone: '+1 (813) 555-0101', status: 'new',       score: 88, grade: 'A',  area: 'CAR_ACCIDENT',      duration: 420, transcription: 'Marcus was rear-ended on I-275. Severe whiplash and back injury. ER visit, now in physical therapy. Other driver cited by police.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','2'],['CA_Q03_INJURY_SEVERITY','4'],['CA_Q04_MEDICAL_TREATMENT','2'],['CA_Q05_FAULT','1'],['CA_Q06_PRIOR_ATTORNEY','2'],['CA_Q07_POLICE_REPORT','1']] },
  { first: 'Olivia',  last: 'Bennett', phone: '+1 (407) 555-0202', status: 'new',       score: 72, grade: 'B',  area: 'CAR_ACCIDENT',      duration: 310, transcription: 'Olivia was T-boned at intersection. Broken arm. Surgery scheduled. Other driver ran red light.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','3'],['CA_Q03_INJURY_SEVERITY','3'],['CA_Q04_MEDICAL_TREATMENT','1'],['CA_Q05_FAULT','1'],['CA_Q06_PRIOR_ATTORNEY','2']] },
  { first: 'Ethan',   last: 'Clarke',  phone: '+1 (954) 555-0303', status: 'qualified', score: 91, grade: 'A+', area: 'CAR_ACCIDENT',      duration: 580, transcription: 'Ethan suffered spinal injury in multi-vehicle accident on I-95. Multiple surgeries. Lost wages significant. Police report filed.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','1'],['CA_Q03_INJURY_SEVERITY','5'],['CA_Q04_MEDICAL_TREATMENT','3'],['CA_Q05_FAULT','1'],['CA_Q06_PRIOR_ATTORNEY','2'],['CA_Q07_POLICE_REPORT','1'],['CA_Q08_WITNESSES','1'],['CA_Q09_LOST_WAGES','1']] },
  { first: 'Sophia',  last: 'Rivera',  phone: '+1 (305) 555-0404', status: 'scheduled', score: 85, grade: 'A',  area: 'CAR_ACCIDENT',      duration: 495, transcription: 'Sophia hit by distracted driver. Concussion and soft tissue injury. Has medical records.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','2'],['CA_Q03_INJURY_SEVERITY','3'],['CA_Q04_MEDICAL_TREATMENT','2'],['CA_Q05_FAULT','1'],['CA_Q06_PRIOR_ATTORNEY','2'],['CA_Q07_POLICE_REPORT','1']] },
  { first: 'Liam',    last: 'Foster',  phone: '+1 (561) 555-0505', status: 'new',       score: 55, grade: 'C',  area: 'CAR_ACCIDENT',      duration: 180, transcription: 'Liam minor fender bender. No injuries requiring treatment. Vehicle damage only.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','3'],['CA_Q03_INJURY_SEVERITY','1']] },
  { first: 'Emma',    last: 'Patel',   phone: '+1 (786) 555-0606', status: 'new',       score: 78, grade: 'B+', area: 'CAR_ACCIDENT',      duration: 390, transcription: 'Emma rear-ended while stopped at light. Neck and shoulder injuries. Seeking chiropractic care.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','2'],['CA_Q03_INJURY_SEVERITY','2'],['CA_Q04_MEDICAL_TREATMENT','1'],['CA_Q05_FAULT','1'],['CA_Q06_PRIOR_ATTORNEY','2']] },

  // --- SLIP & FALL leads ---
  { first: 'Noah',    last: 'Campbell',  phone: '+1 (813) 555-0707', status: 'new',       score: 80, grade: 'A',  area: 'SLIP_FALL',        duration: 445, transcription: 'Noah slipped on unmarked wet floor at grocery store. Fractured wrist. Store employee admitted no wet floor sign.', responses: [['SF_Q01_JURISDICTION','1'],['SF_Q02_WHEN_OCCURRED','2'],['SF_Q04_HAZARD_CONDITION','1'],['SF_Q06_PROPERTY_OWNER_AWARENESS','1'],['SF_Q10_MEDICAL_TREATMENT','2']] },
  { first: 'Ava',     last: 'Mitchell', phone: '+1 (352) 555-0808', status: 'qualified', score: 88, grade: 'A',  area: 'SLIP_FALL',        duration: 520, transcription: 'Ava tripped on broken sidewalk outside retail store. Ankle fracture requiring surgery. Property owner notified previously about sidewalk.', responses: [['SF_Q01_JURISDICTION','1'],['SF_Q02_WHEN_OCCURRED','1'],['SF_Q04_HAZARD_CONDITION','3'],['SF_Q06_PROPERTY_OWNER_AWARENESS','1'],['SF_Q08_WITNESSES','2'],['SF_Q10_MEDICAL_TREATMENT','3']] },
  { first: 'James',   last: 'Stewart',  phone: '+1 (850) 555-0909', status: 'new',       score: 65, grade: 'B-', area: 'SLIP_FALL',        duration: 290, transcription: 'James slipped at restaurant. Minor back strain. No ER visit, just urgent care.', responses: [['SF_Q01_JURISDICTION','1'],['SF_Q02_WHEN_OCCURRED','3'],['SF_Q04_HAZARD_CONDITION','1'],['SF_Q10_MEDICAL_TREATMENT','1']] },
  { first: 'Isabella', last: 'Nguyen', phone: '+1 (904) 555-1010', status: 'scheduled', score: 82, grade: 'A-', area: 'SLIP_FALL',        duration: 470, transcription: 'Isabella fell on unmarked ice at apartment complex. Hip injury. Property management aware of icy conditions, took no action.', responses: [['SF_Q01_JURISDICTION','1'],['SF_Q02_WHEN_OCCURRED','2'],['SF_Q04_HAZARD_CONDITION','2'],['SF_Q06_PROPERTY_OWNER_AWARENESS','1'],['SF_Q10_MEDICAL_TREATMENT','2']] },
  { first: 'William', last: 'Torres',  phone: '+1 (727) 555-1111', status: 'new',       score: 70, grade: 'B',  area: 'SLIP_FALL',        duration: 340, transcription: 'William fell due to poor lighting in parking garage. Knee injury. Seeking medical evaluation.', responses: [['SF_Q01_JURISDICTION','1'],['SF_Q02_WHEN_OCCURRED','2'],['SF_Q04_HAZARD_CONDITION','4'],['SF_Q10_MEDICAL_TREATMENT','1']] },

  // --- DOG BITE leads ---
  { first: 'Charlotte', last: 'Adams', phone: '+1 (813) 555-1212', status: 'new',       score: 84, grade: 'A',  area: 'DOG_BITE',         duration: 410, transcription: 'Charlotte bitten by neighbor dog. Deep puncture wounds on arm. ER treated. Dog owner known, dog not vaccinated.', responses: [['DB_Q01_JURISDICTION','1'],['DB_Q02_WHEN_OCCURRED','1'],['DB_Q03_INJURY_SEVERITY','3'],['DB_Q04_MEDICAL_TREATMENT','2'],['DB_Q05_OWNER_KNOWN','1'],['DB_Q06_PRIOR_ATTORNEY','2']] },
  { first: 'Henry',    last: 'Lee',    phone: '+1 (954) 555-1313', status: 'qualified', score: 90, grade: 'A+', area: 'DOG_BITE',         duration: 530, transcription: 'Henry attacked by unleashed dog at park. Multiple lacerations on face and hand. Plastic surgery required. Dog owner identified.', responses: [['DB_Q01_JURISDICTION','1'],['DB_Q02_WHEN_OCCURRED','1'],['DB_Q03_INJURY_SEVERITY','5'],['DB_Q04_MEDICAL_TREATMENT','3'],['DB_Q05_OWNER_KNOWN','1'],['DB_Q06_PRIOR_ATTORNEY','2'],['DB_Q07_WITNESSES','1']] },
  { first: 'Amelia',   last: 'White',  phone: '+1 (407) 555-1414', status: 'new',       score: 60, grade: 'C+', area: 'DOG_BITE',         duration: 220, transcription: 'Amelia nipped by small dog. Minor scratches. Owner not known. No serious medical treatment needed.', responses: [['DB_Q01_JURISDICTION','1'],['DB_Q02_WHEN_OCCURRED','3'],['DB_Q03_INJURY_SEVERITY','1'],['DB_Q05_OWNER_KNOWN','2']] },
  { first: 'Lucas',    last: 'Harris', phone: '+1 (561) 555-1515', status: 'scheduled', score: 87, grade: 'A',  area: 'DOG_BITE',         duration: 480, transcription: 'Lucas bit by guard dog at commercial property. Arm injuries requiring stitches. Property owner is business with insurance.', responses: [['DB_Q01_JURISDICTION','1'],['DB_Q02_WHEN_OCCURRED','2'],['DB_Q03_INJURY_SEVERITY','3'],['DB_Q04_MEDICAL_TREATMENT','2'],['DB_Q05_OWNER_KNOWN','1'],['DB_Q06_PRIOR_ATTORNEY','2']] },

  // --- WORKPLACE INJURY leads ---
  { first: 'Mia',      last: 'Robinson', phone: '+1 (305) 555-1616', status: 'new',       score: 76, grade: 'B+', area: 'WORKPLACE_INJURY',  duration: 370, transcription: 'Mia injured back lifting heavy equipment at warehouse. No safety equipment provided. Workers comp denied. Employer negligence.', responses: [['WI_Q01_JURISDICTION','1'],['WI_Q02_WHEN_OCCURRED','2'],['WI_Q03_INJURY_SEVERITY','3'],['WI_Q04_MEDICAL_TREATMENT','2'],['WI_Q05_WORKERS_COMP','2'],['WI_Q06_PRIOR_ATTORNEY','2']] },
  { first: 'Alexander', last: 'Moore', phone: '+1 (786) 555-1717', status: 'qualified', score: 92, grade: 'A+', area: 'WORKPLACE_INJURY',  duration: 610, transcription: 'Alexander fell from scaffolding at construction site. Multiple fractures and head injury. OSHA violation cited. Employer lacks insurance.', responses: [['WI_Q01_JURISDICTION','1'],['WI_Q02_WHEN_OCCURRED','1'],['WI_Q03_INJURY_SEVERITY','5'],['WI_Q04_MEDICAL_TREATMENT','3'],['WI_Q05_WORKERS_COMP','2'],['WI_Q06_PRIOR_ATTORNEY','2'],['WI_Q07_WITNESSES','1'],['WI_Q08_LOST_WAGES','1']] },
  { first: 'Harper',   last: 'Jackson', phone: '+1 (352) 555-1818', status: 'new',       score: 68, grade: 'B-', area: 'WORKPLACE_INJURY',  duration: 300, transcription: 'Harper sprained ankle due to wet floor at workplace. Minor injury. Workers comp claim filed but seeking additional compensation.', responses: [['WI_Q01_JURISDICTION','1'],['WI_Q02_WHEN_OCCURRED','3'],['WI_Q03_INJURY_SEVERITY','2'],['WI_Q04_MEDICAL_TREATMENT','1'],['WI_Q05_WORKERS_COMP','1']] },
  { first: 'Elijah',   last: 'Thompson', phone: '+1 (850) 555-1919', status: 'scheduled', score: 83, grade: 'A-', area: 'WORKPLACE_INJURY', duration: 460, transcription: 'Elijah sustained hearing damage from industrial machinery. Long-term exposure, no hearing protection provided. Medical documentation complete.', responses: [['WI_Q01_JURISDICTION','1'],['WI_Q02_WHEN_OCCURRED','2'],['WI_Q03_INJURY_SEVERITY','3'],['WI_Q04_MEDICAL_TREATMENT','2'],['WI_Q05_WORKERS_COMP','2'],['WI_Q06_PRIOR_ATTORNEY','2']] },

  // --- OTHER PERSONAL INJURY leads ---
  { first: 'Abigail',  last: 'Garcia',   phone: '+1 (904) 555-2020', status: 'new',       score: 74, grade: 'B',  area: 'OTHER_PERSONAL_INJURY', duration: 355, transcription: 'Abigail injured by defective product — blender exploded causing hand lacerations. Still has product. Manufacturer known.', responses: [['OPI_Q01_JURISDICTION','1'],['OPI_Q02_WHEN_OCCURRED','2'],['OPI_Q03_INJURY_SEVERITY','3'],['OPI_Q04_MEDICAL_TREATMENT','2'],['OPI_Q05_PARTY_KNOWN','1'],['OPI_Q06_PRIOR_ATTORNEY','2']] },
  { first: 'Benjamin', last: 'Martin',   phone: '+1 (727) 555-2121', status: 'new',       score: 81, grade: 'A-', area: 'OTHER_PERSONAL_INJURY', duration: 430, transcription: 'Benjamin hit by cyclist running red light while walking. Knee and shoulder injuries. Police report filed. Cyclist identified with insurance.', responses: [['OPI_Q01_JURISDICTION','1'],['OPI_Q02_WHEN_OCCURRED','1'],['OPI_Q03_INJURY_SEVERITY','3'],['OPI_Q04_MEDICAL_TREATMENT','2'],['OPI_Q05_PARTY_KNOWN','1'],['OPI_Q06_PRIOR_ATTORNEY','2'],['OPI_Q07_POLICE_REPORT','1']] },
  { first: 'Scarlett',  last: 'Anderson', phone: '+1 (813) 555-2222', status: 'lost',      score: 40, grade: 'D',  area: 'OTHER_PERSONAL_INJURY', duration: 90,  transcription: 'Scarlett reported very old incident — over 4 years ago. Statute of limitations likely expired.', responses: [['OPI_Q01_JURISDICTION','1'],['OPI_Q02_WHEN_OCCURRED','5']] },
  { first: 'Daniel',   last: 'Wilson',   phone: '+1 (407) 555-2323', status: 'new',       score: 77, grade: 'B+', area: 'OTHER_PERSONAL_INJURY', duration: 405, transcription: 'Daniel injured when hotel elevator malfunctioned, dropping 3 floors suddenly. Back and neck injuries. Hotel management notified.', responses: [['OPI_Q01_JURISDICTION','1'],['OPI_Q02_WHEN_OCCURRED','2'],['OPI_Q03_INJURY_SEVERITY','3'],['OPI_Q04_MEDICAL_TREATMENT','2'],['OPI_Q05_PARTY_KNOWN','1'],['OPI_Q06_PRIOR_ATTORNEY','2']] },

  // --- Additional mixed leads for volume ---
  { first: 'Chloe',    last: 'Taylor',   phone: '+1 (954) 555-2424', status: 'new',       score: 86, grade: 'A',  area: 'CAR_ACCIDENT',      duration: 500, transcription: 'Chloe sideswiped by truck changing lanes without signal. Broken ribs and hand. Truck identified — commercial vehicle with company plates.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','1'],['CA_Q03_INJURY_SEVERITY','4'],['CA_Q04_MEDICAL_TREATMENT','2'],['CA_Q05_FAULT','1'],['CA_Q06_PRIOR_ATTORNEY','2'],['CA_Q07_POLICE_REPORT','1']] },
  { first: 'Jackson',  last: 'Brown',    phone: '+1 (305) 555-2525', status: 'qualified', score: 89, grade: 'A',  area: 'SLIP_FALL',         duration: 545, transcription: 'Jackson slipped on uneven pavement at shopping mall. Knee ligament tear requiring surgery. Mall security camera caught the fall.', responses: [['SF_Q01_JURISDICTION','1'],['SF_Q02_WHEN_OCCURRED','1'],['SF_Q04_HAZARD_CONDITION','3'],['SF_Q06_PROPERTY_OWNER_AWARENESS','2'],['SF_Q08_WITNESSES','1'],['SF_Q10_MEDICAL_TREATMENT','3']] },
  { first: 'Grace',    last: 'Evans',    phone: '+1 (561) 555-2626', status: 'new',       score: 63, grade: 'C',  area: 'DOG_BITE',          duration: 200, transcription: 'Grace scratched by cat at neighbor property. Minimal injury. Seeking information about options.', responses: [['DB_Q01_JURISDICTION','1'],['DB_Q02_WHEN_OCCURRED','3'],['DB_Q03_INJURY_SEVERITY','1'],['DB_Q05_OWNER_KNOWN','1']] },
  { first: 'Sebastian', last: 'King',   phone: '+1 (786) 555-2727', status: 'new',       score: 79, grade: 'B+', area: 'CAR_ACCIDENT',      duration: 415, transcription: 'Sebastian hit from behind at stop sign. Whiplash. Opposing driver admitted fault at scene. Has dashcam footage.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','2'],['CA_Q03_INJURY_SEVERITY','2'],['CA_Q04_MEDICAL_TREATMENT','1'],['CA_Q05_FAULT','1'],['CA_Q06_PRIOR_ATTORNEY','2'],['CA_Q07_POLICE_REPORT','1']] },
  { first: 'Penelope',  last: 'Scott',  phone: '+1 (352) 555-2828', status: 'new',       score: 71, grade: 'B',  area: 'WORKPLACE_INJURY',  duration: 360, transcription: 'Penelope suffered chemical burn at laboratory job. No proper safety training provided. Medical treatment ongoing.', responses: [['WI_Q01_JURISDICTION','1'],['WI_Q02_WHEN_OCCURRED','2'],['WI_Q03_INJURY_SEVERITY','3'],['WI_Q04_MEDICAL_TREATMENT','2'],['WI_Q05_WORKERS_COMP','2'],['WI_Q06_PRIOR_ATTORNEY','2']] },
  { first: 'Owen',      last: 'Turner', phone: '+1 (850) 555-2929', status: 'scheduled', score: 84, grade: 'A',  area: 'CAR_ACCIDENT',      duration: 490, transcription: 'Owen pedestrian hit while crossing at crosswalk. Driver ran red light. Leg fracture. Police report. Driver has insurance.', responses: [['CA_Q01_JURISDICTION','1'],['CA_Q02_INCIDENT_DATE','1'],['CA_Q03_INJURY_SEVERITY','4'],['CA_Q04_MEDICAL_TREATMENT','2'],['CA_Q05_FAULT','1'],['CA_Q06_PRIOR_ATTORNEY','2'],['CA_Q07_POLICE_REPORT','1'],['CA_Q08_WITNESSES','2']] },
  { first: 'Zoey',      last: 'Baker',  phone: '+1 (904) 555-3030', status: 'new',       score: 75, grade: 'B+', area: 'SLIP_FALL',         duration: 380, transcription: 'Zoey fell down poorly lit staircase at apartment building. Manager knew about burnt-out bulbs. Ankle sprain and back injury.', responses: [['SF_Q01_JURISDICTION','1'],['SF_Q02_WHEN_OCCURRED','2'],['SF_Q04_HAZARD_CONDITION','4'],['SF_Q06_PROPERTY_OWNER_AWARENESS','1'],['SF_Q10_MEDICAL_TREATMENT','1']] },
];

async function seedLead(lead, createdAt) {
  const leadId = randomUUID();
  const sessionId = randomUUID();

  const { error: leadError } = await client.from('leads').insert({
    lead_id:            leadId,
    tenant_id:          TENANT_ID,
    first_name:         lead.first,
    last_name:          lead.last,
    phone:              lead.phone,
    email:              `${lead.first.toLowerCase()}.${lead.last.toLowerCase()}@email-test.com`,
    status:             lead.status,
    practice_area_code: lead.area,
    lead_score:         lead.score,
    lead_grade:         lead.grade,
    is_qualified:       lead.score >= 80,
    session_id:         sessionId,
    created_at:         createdAt,
    updated_at:         createdAt,
    unlocked_at:        lead.score >= 85 ? createdAt : null,
    unlocked_by:        lead.score >= 85 ? 'system-seed' : null,
    booking_date:       ['scheduled'].includes(lead.status) ? new Date(new Date(createdAt).getTime() + 86400000 * 3).toISOString() : null,
  });

  if (leadError) {
    console.error(`  ✗ Lead insert error for ${lead.first}:`, leadError.message);
    return false;
  }

  const { error: sessionError } = await client.from('intake_sessions').insert({
    session_id:       sessionId,
    tenant_id:        TENANT_ID,
    lead_id:          leadId,
    twilio_call_sid:  `CA${leadId.replace(/-/g, '').substring(0, 32)}`,
    start_time:       createdAt,
    end_time:         new Date(new Date(createdAt).getTime() + lead.duration * 1000).toISOString(),
    duration_seconds: lead.duration,
    final_state:      'completed',
    completed:        true,
    created_at:       createdAt,
    updated_at:       createdAt,
  });

  if (sessionError) {
    console.error(`  ✗ Session insert error for ${lead.first}:`, sessionError.message);
  }

  if (lead.transcription) {
    await client.from('call_transcriptions').insert({
      transcription_id: randomUUID(),
      call_sid:         `CA${leadId.replace(/-/g, '').substring(0, 32)}`,
      session_id:       sessionId,
      transcript_text:  lead.transcription,
      status:           'completed',
      language_code:    'en-US',
      created_at:       createdAt,
      updated_at:       createdAt,
    });
  }

  if (lead.responses?.length) {
    const responseRecords = lead.responses.map(([key, val]) => ({
      response_id:    randomUUID(),
      session_id:     sessionId,
      question_key:   key,
      response_value: val,
      response_type:  'multiple_choice',
      captured_at:    createdAt,
      created_at:     createdAt,
      updated_at:     createdAt,
    }));
    await client.from('intake_responses').insert(responseRecords);
  }

  return true;
}

async function main() {
  console.log(`\nSeeding ${LEADS.length} March 2026 leads for Oakwood Law Firm...\n`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < LEADS.length; i++) {
    const lead = LEADS[i];
    const createdAt = MARCH_DATES[i];
    process.stdout.write(`  [${i + 1}/${LEADS.length}] ${lead.first} ${lead.last} (${lead.area}, ${lead.status})... `);
    const ok = await seedLead(lead, createdAt);
    if (ok) {
      console.log('✓');
      success++;
    } else {
      console.log('✗');
      fail++;
    }
  }

  console.log(`\nDone: ${success} succeeded, ${fail} failed.`);
  console.log('Oakwood Law Firm March 2026 test data ready.\n');
}

main().catch(console.error);
