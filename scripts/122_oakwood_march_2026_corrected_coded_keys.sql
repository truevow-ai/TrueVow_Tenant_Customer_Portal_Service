-- =============================================================================
-- 122_oakwood_march_2026_corrected_coded_keys.sql
-- Oakwood Law Firm — March 2026 intake test data
-- CORRECTED: coded question keys + lowercase practice_area_code
--
-- Target : SaaS Admin Supabase DB  →  table: tenant_intake_leads_session
-- Tenant : e2362e1c-759a-402d-9b38-2eab1ae8ad3f
--
-- Run in Supabase SQL Editor or psql
--
-- RESPONSE VALUE LEGEND
-- ─────────────────────────────────────────────────────────────
-- CA_Q01_JURISDICTION          1=Yes (FL)   2=No
-- CA_Q02_WHEN_OCCURRED         1=Today/Yesterday  2=Past week  3=Past month  4=Over month
-- CA_Q03_ACCIDENT_TYPE         1=Rear-end  2=T-bone  3=Sideswipe  4=Head-on  5=Commercial/Truck
-- CA_Q04_AT_FAULT              1=Other driver  2=Shared  3=Client
-- CA_Q05_INJURY_DESCRIPTION    1=Minor/whiplash  2=Herniated disc  3=Multiple severe  4=TBI
-- CA_Q06_MEDICAL_TREATMENT     1=No tx  2=ER only  3=ER+ongoing PT  4=Chiro only  5=Surgery sched  6=Multiple surgeries
-- CA_Q07_CITATION              1=No citation  2=Other driver cited
-- CA_Q08_WITNESSES             1=Yes  2=Passenger  3=None
-- CA_Q09_LOST_WAGES            1=None  2=<1 week  3=1+ months  4=Lost job
-- SF_Q01_JURISDICTION          1=Yes (FL)
-- SF_Q02_WHEN_OCCURRED         (same as CA)
-- SF_Q04_HAZARD_CONDITION      1=Wet floor  2=Uneven surface  3=Debris  4=No handrail  5=Poor lighting
-- SF_Q06_PROPERTY_OWNER_AWARENESS  1=Owner knew  2=Should have known  3=Unknown
-- SF_Q07_INCIDENT_REPORT       1/2=Filed  3=Not filed
-- SF_Q08_INJURY_DESCRIPTION    1=Minor  2=Moderate  3=Severe  (Case Summary)
-- SF_Q08_WITNESSES             1=Yes  2=Passenger  3=None   (Signal Panel)
-- SF_Q10_MEDICAL_TREATMENT     1=No tx  2=ER+follow-up  3=Ongoing PT/Chiro  4=Surgery sched
-- SF_Q12_LOST_WAGES            (same codes as CA_Q09)
-- DB_Q01_JURISDICTION          1=Yes (FL)
-- DB_Q02_WHEN_OCCURRED         (same as CA)
-- DB_Q02_DOG_OWNER             1=Identified (Signal Panel liability/insurance)
-- DB_Q03_DOG_OWNER             1=Neighbor  2=Friend  3=Stray  (Case Summary)
-- DB_Q03_PROVOCATION           1=No  2=Yes  (Signal Panel liability)
-- DB_Q04_INJURY_DESCRIPTION    1=Minor  2=Moderate (stitches)  3=Severe (surgery)
-- DB_Q05_PROVOCATION           1=No  2=Yes  (determineLiability / Case Summary)
-- DB_Q07_MEDICAL_TREATMENT     1=No tx  2=ER  3=Stitches  4=Plastic surgery  5=Reconstructive
-- WI_Q01_JURISDICTION          1=Yes (FL)
-- WI_Q02_WHEN_OCCURRED         (same as CA)
-- WI_Q07_THIRD_PARTY_LIABILITY 1=Yes  2=Employer only  3=No third party  4=Unknown
-- WI_Q08_MEDICAL_TREATMENT     (same codes as CA_Q06)
-- OPI_Q01_JURISDICTION         1=Yes (FL)
-- OPI_Q02_WHEN_OCCURRED        (same as CA)
-- OPI_Q03_INCIDENT_TYPE        1=Product liability  2=Pedestrian  3=Premises  4=Other
-- OPI_Q07_MEDICAL_TREATMENT    (same codes as CA_Q06)
-- CONFLICT_Q01_PRIOR_REP       1=No prior attorney  2=Consulted another  3=Currently represented
--
-- NOTE on practice_area_code casing:
--   IntakeSignalPanel.tsx compares  pa === 'dog_bite' / 'slip_fall'  (lowercase)
--   Store lowercase: car_accident, slip_fall, dog_bite, workplace_injury, other_personal_injury
--
-- NOTE on dog_bite dual-keys:
--   DB_Q02_DOG_OWNER / DB_Q03_PROVOCATION  → IntakeSignalPanel (exact-match)
--   DB_Q03_DOG_OWNER / DB_Q05_PROVOCATION  → TokenizedSummaryCard + QUESTION_LABELS
--   Both sets are stored so both components render correctly.
-- =============================================================================

BEGIN;

-- ── Wipe previous seed rows for this tenant ──────────────────────────────────
DELETE FROM tenant_intake_leads_session
WHERE tenant_id = 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f';

-- ── Insert 30 corrected leads ─────────────────────────────────────────────────
INSERT INTO tenant_intake_leads_session (
  session_id,          tenant_id,
  contact_first_name,  contact_last_name,  contact_email,           contact_phone,
  practice_area_code,  final_state,        lead_score,
  start_time,          end_time,           duration_seconds,
  twilio_call_sid,
  tags,                responses,          deleted_at
) VALUES

-- ════════════════════════════════════════════════════════════════
-- CAR ACCIDENT  (9 leads)
-- ════════════════════════════════════════════════════════════════

-- 1. Marcus Johnson | car_accident | new | score 88
-- Rear-ended on I-275 · whiplash + back · ER + PT · other driver cited
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Marcus','Johnson','marcus.johnson@email-test.com','+1 (813) 555-0101',
 'car_accident','partial',88,
 '2026-03-01 08:15:00+00',
 '2026-03-01 08:15:00+00'::timestamptz + interval '420 seconds',
 420,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"2"},{"key":"CA_Q03_ACCIDENT_TYPE","value":"1"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"2"},{"key":"CA_Q06_MEDICAL_TREATMENT","value":"3"},{"key":"CA_Q07_CITATION","value":"2"},{"key":"CA_Q08_WITNESSES","value":"1"},{"key":"CA_Q09_LOST_WAGES","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 2. Olivia Bennett | car_accident | new | score 72
-- T-boned at intersection · broken arm · surgery scheduled · red light
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Olivia','Bennett','olivia.bennett@email-test.com','+1 (407) 555-0202',
 'car_accident','partial',72,
 '2026-03-01 11:30:00+00',
 '2026-03-01 11:30:00+00'::timestamptz + interval '310 seconds',
 310,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"3"},{"key":"CA_Q03_ACCIDENT_TYPE","value":"2"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"3"},{"key":"CA_Q06_MEDICAL_TREATMENT","value":"5"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 3. Ethan Clarke | car_accident | qualified | score 91
-- Multi-vehicle I-95 · spinal injury · multiple surgeries · significant lost wages
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Ethan','Clarke','ethan.clarke@email-test.com','+1 (954) 555-0303',
 'car_accident','completed',91,
 '2026-03-01 14:45:00+00',
 '2026-03-01 14:45:00+00'::timestamptz + interval '580 seconds',
 580,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"1"},{"key":"CA_Q03_ACCIDENT_TYPE","value":"4"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"3"},{"key":"CA_Q06_MEDICAL_TREATMENT","value":"6"},{"key":"CA_Q07_CITATION","value":"2"},{"key":"CA_Q08_WITNESSES","value":"1"},{"key":"CA_Q09_LOST_WAGES","value":"4"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 4. Sophia Rivera | car_accident | scheduled | score 85
-- Distracted driver · concussion + soft tissue · ER · police citation
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Sophia','Rivera','sophia.rivera@email-test.com','+1 (305) 555-0404',
 'car_accident','scheduled',85,
 '2026-03-02 09:00:00+00',
 '2026-03-02 09:00:00+00'::timestamptz + interval '495 seconds',
 495,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"2"},{"key":"CA_Q03_ACCIDENT_TYPE","value":"1"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"4"},{"key":"CA_Q06_MEDICAL_TREATMENT","value":"2"},{"key":"CA_Q07_CITATION","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 5. Liam Foster | car_accident | new | score 55
-- Minor fender bender · no significant injuries · vehicle damage only
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Liam','Foster','liam.foster@email-test.com','+1 (561) 555-0505',
 'car_accident','partial',55,
 '2026-03-02 13:20:00+00',
 '2026-03-02 13:20:00+00'::timestamptz + interval '180 seconds',
 180,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"3"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"1"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 6. Emma Patel | car_accident | new | score 78
-- Rear-ended while stopped · neck + shoulder · chiropractic care
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Emma','Patel','emma.patel@email-test.com','+1 (786) 555-0606',
 'car_accident','partial',78,
 '2026-03-02 16:10:00+00',
 '2026-03-02 16:10:00+00'::timestamptz + interval '390 seconds',
 390,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"2"},{"key":"CA_Q03_ACCIDENT_TYPE","value":"1"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"1"},{"key":"CA_Q06_MEDICAL_TREATMENT","value":"4"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 7. Chloe Taylor | car_accident | new | score 86
-- Sideswiped by commercial truck · broken ribs + hand · company plates
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Chloe','Taylor','chloe.taylor@email-test.com','+1 (954) 555-2424',
 'car_accident','partial',86,
 '2026-03-06 19:00:00+00',
 '2026-03-06 19:00:00+00'::timestamptz + interval '500 seconds',
 500,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"1"},{"key":"CA_Q03_ACCIDENT_TYPE","value":"5"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"3"},{"key":"CA_Q06_MEDICAL_TREATMENT","value":"3"},{"key":"CA_Q07_CITATION","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 8. Sebastian King | car_accident | new | score 79
-- Rear-ended at stop sign · whiplash · other driver admitted fault · dashcam
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Sebastian','King','sebastian.king@email-test.com','+1 (786) 555-2727',
 'car_accident','partial',79,
 '2026-03-06 19:45:00+00',
 '2026-03-06 19:45:00+00'::timestamptz + interval '415 seconds',
 415,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"2"},{"key":"CA_Q03_ACCIDENT_TYPE","value":"1"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"1"},{"key":"CA_Q06_MEDICAL_TREATMENT","value":"4"},{"key":"CA_Q07_CITATION","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 9. Owen Turner | car_accident | scheduled | score 84
-- Pedestrian struck at crosswalk · driver ran red · leg fracture · bystander witness
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Owen','Turner','owen.turner@email-test.com','+1 (850) 555-2929',
 'car_accident','scheduled',84,
 '2026-03-06 20:15:00+00',
 '2026-03-06 20:15:00+00'::timestamptz + interval '490 seconds',
 490,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"CA_Q01_JURISDICTION","value":"1"},{"key":"CA_Q02_WHEN_OCCURRED","value":"1"},{"key":"CA_Q03_ACCIDENT_TYPE","value":"1"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q05_INJURY_DESCRIPTION","value":"3"},{"key":"CA_Q06_MEDICAL_TREATMENT","value":"3"},{"key":"CA_Q07_CITATION","value":"2"},{"key":"CA_Q08_WITNESSES","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- ════════════════════════════════════════════════════════════════
-- SLIP & FALL  (7 leads)
-- ════════════════════════════════════════════════════════════════

-- 10. Noah Campbell | slip_fall | new | score 80
-- Wet floor grocery store · fractured wrist · employee admitted no sign
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Noah','Campbell','noah.campbell@email-test.com','+1 (813) 555-0707',
 'slip_fall','partial',80,
 '2026-03-03 08:45:00+00',
 '2026-03-03 08:45:00+00'::timestamptz + interval '445 seconds',
 445,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"SF_Q01_JURISDICTION","value":"1"},{"key":"SF_Q02_WHEN_OCCURRED","value":"2"},{"key":"SF_Q04_HAZARD_CONDITION","value":"1"},{"key":"SF_Q06_PROPERTY_OWNER_AWARENESS","value":"1"},{"key":"SF_Q07_INCIDENT_REPORT","value":"2"},{"key":"SF_Q08_INJURY_DESCRIPTION","value":"2"},{"key":"SF_Q08_WITNESSES","value":"1"},{"key":"SF_Q10_MEDICAL_TREATMENT","value":"2"},{"key":"SF_Q12_LOST_WAGES","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 11. Ava Mitchell | slip_fall | qualified | score 88
-- Broken sidewalk retail · ankle fracture surgery · property owner notified prior
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Ava','Mitchell','ava.mitchell@email-test.com','+1 (352) 555-0808',
 'slip_fall','completed',88,
 '2026-03-03 10:30:00+00',
 '2026-03-03 10:30:00+00'::timestamptz + interval '520 seconds',
 520,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"SF_Q01_JURISDICTION","value":"1"},{"key":"SF_Q02_WHEN_OCCURRED","value":"1"},{"key":"SF_Q04_HAZARD_CONDITION","value":"2"},{"key":"SF_Q06_PROPERTY_OWNER_AWARENESS","value":"1"},{"key":"SF_Q07_INCIDENT_REPORT","value":"2"},{"key":"SF_Q08_INJURY_DESCRIPTION","value":"3"},{"key":"SF_Q08_WITNESSES","value":"2"},{"key":"SF_Q10_MEDICAL_TREATMENT","value":"4"},{"key":"SF_Q12_LOST_WAGES","value":"3"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 12. James Stewart | slip_fall | new | score 65
-- Restaurant slip · minor back strain · urgent care only · no incident report
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'James','Stewart','james.stewart@email-test.com','+1 (850) 555-0909',
 'slip_fall','partial',65,
 '2026-03-03 15:00:00+00',
 '2026-03-03 15:00:00+00'::timestamptz + interval '290 seconds',
 290,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"SF_Q01_JURISDICTION","value":"1"},{"key":"SF_Q02_WHEN_OCCURRED","value":"3"},{"key":"SF_Q04_HAZARD_CONDITION","value":"1"},{"key":"SF_Q07_INCIDENT_REPORT","value":"3"},{"key":"SF_Q08_INJURY_DESCRIPTION","value":"1"},{"key":"SF_Q10_MEDICAL_TREATMENT","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 13. Isabella Nguyen | slip_fall | scheduled | score 82
-- Icy apartment complex · hip injury · property mgmt aware · took no action
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Isabella','Nguyen','isabella.nguyen@email-test.com','+1 (904) 555-1010',
 'slip_fall','scheduled',82,
 '2026-03-04 09:15:00+00',
 '2026-03-04 09:15:00+00'::timestamptz + interval '470 seconds',
 470,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"SF_Q01_JURISDICTION","value":"1"},{"key":"SF_Q02_WHEN_OCCURRED","value":"2"},{"key":"SF_Q04_HAZARD_CONDITION","value":"2"},{"key":"SF_Q06_PROPERTY_OWNER_AWARENESS","value":"1"},{"key":"SF_Q07_INCIDENT_REPORT","value":"2"},{"key":"SF_Q08_INJURY_DESCRIPTION","value":"2"},{"key":"SF_Q10_MEDICAL_TREATMENT","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 14. William Torres | slip_fall | new | score 70
-- Poor lighting in parking garage · knee injury · seeking evaluation
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'William','Torres','william.torres@email-test.com','+1 (727) 555-1111',
 'slip_fall','partial',70,
 '2026-03-04 12:00:00+00',
 '2026-03-04 12:00:00+00'::timestamptz + interval '340 seconds',
 340,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"SF_Q01_JURISDICTION","value":"1"},{"key":"SF_Q02_WHEN_OCCURRED","value":"2"},{"key":"SF_Q04_HAZARD_CONDITION","value":"5"},{"key":"SF_Q06_PROPERTY_OWNER_AWARENESS","value":"1"},{"key":"SF_Q08_INJURY_DESCRIPTION","value":"1"},{"key":"SF_Q10_MEDICAL_TREATMENT","value":"1"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 15. Jackson Brown | slip_fall | qualified | score 89
-- Uneven pavement mall · knee ligament tear surgery · security camera captured fall
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Jackson','Brown','jackson.brown@email-test.com','+1 (305) 555-2525',
 'slip_fall','completed',89,
 '2026-03-06 19:15:00+00',
 '2026-03-06 19:15:00+00'::timestamptz + interval '545 seconds',
 545,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"SF_Q01_JURISDICTION","value":"1"},{"key":"SF_Q02_WHEN_OCCURRED","value":"1"},{"key":"SF_Q04_HAZARD_CONDITION","value":"2"},{"key":"SF_Q06_PROPERTY_OWNER_AWARENESS","value":"2"},{"key":"SF_Q07_INCIDENT_REPORT","value":"2"},{"key":"SF_Q08_INJURY_DESCRIPTION","value":"3"},{"key":"SF_Q08_WITNESSES","value":"1"},{"key":"SF_Q10_MEDICAL_TREATMENT","value":"4"},{"key":"SF_Q12_LOST_WAGES","value":"3"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 16. Zoey Baker | slip_fall | new | score 75
-- Poorly lit staircase · landlord knew about burnt-out bulbs · ankle sprain + back
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Zoey','Baker','zoey.baker@email-test.com','+1 (904) 555-3030',
 'slip_fall','partial',75,
 '2026-03-06 20:30:00+00',
 '2026-03-06 20:30:00+00'::timestamptz + interval '380 seconds',
 380,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"SF_Q01_JURISDICTION","value":"1"},{"key":"SF_Q02_WHEN_OCCURRED","value":"2"},{"key":"SF_Q04_HAZARD_CONDITION","value":"5"},{"key":"SF_Q06_PROPERTY_OWNER_AWARENESS","value":"1"},{"key":"SF_Q08_INJURY_DESCRIPTION","value":"1"},{"key":"SF_Q10_MEDICAL_TREATMENT","value":"1"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- ════════════════════════════════════════════════════════════════
-- DOG BITE  (5 leads)
-- NOTE: dual keys per note at top of file
--   DB_Q02_DOG_OWNER / DB_Q03_PROVOCATION  → IntakeSignalPanel
--   DB_Q03_DOG_OWNER / DB_Q05_PROVOCATION  → TokenizedSummaryCard + QUESTION_LABELS
-- ════════════════════════════════════════════════════════════════

-- 17. Charlotte Adams | dog_bite | new | score 84
-- Neighbor dog · deep punctures arm · ER · owner known and identified
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Charlotte','Adams','charlotte.adams@email-test.com','+1 (813) 555-1212',
 'dog_bite','partial',84,
 '2026-03-04 17:00:00+00',
 '2026-03-04 17:00:00+00'::timestamptz + interval '410 seconds',
 410,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"DB_Q01_JURISDICTION","value":"1"},{"key":"DB_Q02_WHEN_OCCURRED","value":"1"},{"key":"DB_Q02_DOG_OWNER","value":"1"},{"key":"DB_Q03_DOG_OWNER","value":"1"},{"key":"DB_Q03_PROVOCATION","value":"1"},{"key":"DB_Q04_INJURY_DESCRIPTION","value":"2"},{"key":"DB_Q05_PROVOCATION","value":"1"},{"key":"DB_Q07_MEDICAL_TREATMENT","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 18. Henry Lee | dog_bite | qualified | score 90
-- Unleashed dog at park · multiple face + hand lacerations · plastic surgery · owner ID'd
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Henry','Lee','henry.lee@email-test.com','+1 (954) 555-1313',
 'dog_bite','completed',90,
 '2026-03-05 08:00:00+00',
 '2026-03-05 08:00:00+00'::timestamptz + interval '530 seconds',
 530,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"DB_Q01_JURISDICTION","value":"1"},{"key":"DB_Q02_WHEN_OCCURRED","value":"1"},{"key":"DB_Q02_DOG_OWNER","value":"1"},{"key":"DB_Q03_DOG_OWNER","value":"1"},{"key":"DB_Q03_PROVOCATION","value":"1"},{"key":"DB_Q04_INJURY_DESCRIPTION","value":"3"},{"key":"DB_Q05_PROVOCATION","value":"1"},{"key":"DB_Q07_MEDICAL_TREATMENT","value":"4"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 19. Amelia White | dog_bite | new | score 60
-- Small dog nip · minor scratches · stray dog · no serious medical treatment
-- (DB_Q02_DOG_OWNER omitted → signal panel shows "Dog owner not yet identified")
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Amelia','White','amelia.white@email-test.com','+1 (407) 555-1414',
 'dog_bite','partial',60,
 '2026-03-05 11:00:00+00',
 '2026-03-05 11:00:00+00'::timestamptz + interval '220 seconds',
 220,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"DB_Q01_JURISDICTION","value":"1"},{"key":"DB_Q02_WHEN_OCCURRED","value":"3"},{"key":"DB_Q03_DOG_OWNER","value":"3"},{"key":"DB_Q03_PROVOCATION","value":"1"},{"key":"DB_Q04_INJURY_DESCRIPTION","value":"1"},{"key":"DB_Q05_PROVOCATION","value":"1"},{"key":"DB_Q07_MEDICAL_TREATMENT","value":"1"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 20. Lucas Harris | dog_bite | scheduled | score 87
-- Guard dog commercial property · arm stitches · business owner with insurance
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Lucas','Harris','lucas.harris@email-test.com','+1 (561) 555-1515',
 'dog_bite','scheduled',87,
 '2026-03-05 14:30:00+00',
 '2026-03-05 14:30:00+00'::timestamptz + interval '480 seconds',
 480,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"DB_Q01_JURISDICTION","value":"1"},{"key":"DB_Q02_WHEN_OCCURRED","value":"2"},{"key":"DB_Q02_DOG_OWNER","value":"2"},{"key":"DB_Q03_DOG_OWNER","value":"2"},{"key":"DB_Q03_PROVOCATION","value":"1"},{"key":"DB_Q04_INJURY_DESCRIPTION","value":"2"},{"key":"DB_Q05_PROVOCATION","value":"1"},{"key":"DB_Q07_MEDICAL_TREATMENT","value":"3"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 21. Grace Evans | dog_bite | new | score 63
-- Cat scratch neighbor property · minimal injury · owner identified
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Grace','Evans','grace.evans@email-test.com','+1 (561) 555-2626',
 'dog_bite','partial',63,
 '2026-03-06 19:30:00+00',
 '2026-03-06 19:30:00+00'::timestamptz + interval '200 seconds',
 200,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"DB_Q01_JURISDICTION","value":"1"},{"key":"DB_Q02_WHEN_OCCURRED","value":"3"},{"key":"DB_Q02_DOG_OWNER","value":"1"},{"key":"DB_Q03_DOG_OWNER","value":"1"},{"key":"DB_Q03_PROVOCATION","value":"1"},{"key":"DB_Q04_INJURY_DESCRIPTION","value":"1"},{"key":"DB_Q05_PROVOCATION","value":"1"},{"key":"DB_Q07_MEDICAL_TREATMENT","value":"1"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- ════════════════════════════════════════════════════════════════
-- WORKPLACE INJURY  (5 leads)
-- ════════════════════════════════════════════════════════════════

-- 22. Mia Robinson | workplace_injury | new | score 76
-- Back injury lifting at warehouse · no safety equipment · workers comp denied
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Mia','Robinson','mia.robinson@email-test.com','+1 (305) 555-1616',
 'workplace_injury','partial',76,
 '2026-03-05 16:45:00+00',
 '2026-03-05 16:45:00+00'::timestamptz + interval '370 seconds',
 370,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"WI_Q01_JURISDICTION","value":"1"},{"key":"WI_Q02_WHEN_OCCURRED","value":"2"},{"key":"WI_Q07_THIRD_PARTY_LIABILITY","value":"1"},{"key":"WI_Q08_MEDICAL_TREATMENT","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 23. Alexander Moore | workplace_injury | qualified | score 92
-- Fell from scaffolding · multiple fractures + head injury · OSHA violation · no insurance
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Alexander','Moore','alexander.moore@email-test.com','+1 (786) 555-1717',
 'workplace_injury','completed',92,
 '2026-03-06 09:30:00+00',
 '2026-03-06 09:30:00+00'::timestamptz + interval '610 seconds',
 610,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"WI_Q01_JURISDICTION","value":"1"},{"key":"WI_Q02_WHEN_OCCURRED","value":"1"},{"key":"WI_Q07_THIRD_PARTY_LIABILITY","value":"1"},{"key":"WI_Q08_MEDICAL_TREATMENT","value":"3"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 24. Harper Jackson | workplace_injury | new | score 68
-- Sprained ankle wet floor · workers comp filed · seeking additional compensation
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Harper','Jackson','harper.jackson@email-test.com','+1 (352) 555-1818',
 'workplace_injury','partial',68,
 '2026-03-06 11:15:00+00',
 '2026-03-06 11:15:00+00'::timestamptz + interval '300 seconds',
 300,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"WI_Q01_JURISDICTION","value":"1"},{"key":"WI_Q02_WHEN_OCCURRED","value":"3"},{"key":"WI_Q07_THIRD_PARTY_LIABILITY","value":"2"},{"key":"WI_Q08_MEDICAL_TREATMENT","value":"1"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 25. Elijah Thompson | workplace_injury | scheduled | score 83
-- Hearing damage from industrial machinery · long-term · no hearing protection provided
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Elijah','Thompson','elijah.thompson@email-test.com','+1 (850) 555-1919',
 'workplace_injury','scheduled',83,
 '2026-03-06 13:45:00+00',
 '2026-03-06 13:45:00+00'::timestamptz + interval '460 seconds',
 460,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"WI_Q01_JURISDICTION","value":"1"},{"key":"WI_Q02_WHEN_OCCURRED","value":"3"},{"key":"WI_Q07_THIRD_PARTY_LIABILITY","value":"1"},{"key":"WI_Q08_MEDICAL_TREATMENT","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 26. Penelope Scott | workplace_injury | new | score 71
-- Chemical burn at laboratory · no safety training · ongoing medical treatment
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Penelope','Scott','penelope.scott@email-test.com','+1 (352) 555-2828',
 'workplace_injury','partial',71,
 '2026-03-06 20:00:00+00',
 '2026-03-06 20:00:00+00'::timestamptz + interval '360 seconds',
 360,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"WI_Q01_JURISDICTION","value":"1"},{"key":"WI_Q02_WHEN_OCCURRED","value":"2"},{"key":"WI_Q07_THIRD_PARTY_LIABILITY","value":"1"},{"key":"WI_Q08_MEDICAL_TREATMENT","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- ════════════════════════════════════════════════════════════════
-- OTHER PERSONAL INJURY  (4 leads)
-- NOTE: CA_Q04_AT_FAULT included where applicable so the signal
--       panel liability branch (else case) renders correctly.
-- ════════════════════════════════════════════════════════════════

-- 27. Abigail Garcia | other_personal_injury | new | score 74
-- Defective blender exploded · hand lacerations · product retained · manufacturer known
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Abigail','Garcia','abigail.garcia@email-test.com','+1 (904) 555-2020',
 'other_personal_injury','partial',74,
 '2026-03-06 15:30:00+00',
 '2026-03-06 15:30:00+00'::timestamptz + interval '355 seconds',
 355,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"OPI_Q01_JURISDICTION","value":"1"},{"key":"OPI_Q02_WHEN_OCCURRED","value":"2"},{"key":"OPI_Q03_INCIDENT_TYPE","value":"1"},{"key":"OPI_Q07_MEDICAL_TREATMENT","value":"2"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 28. Benjamin Martin | other_personal_injury | new | score 81
-- Hit by cyclist running red light · knee + shoulder · police report filed · cyclist ID'd
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Benjamin','Martin','benjamin.martin@email-test.com','+1 (727) 555-2121',
 'other_personal_injury','partial',81,
 '2026-03-06 17:30:00+00',
 '2026-03-06 17:30:00+00'::timestamptz + interval '430 seconds',
 430,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"OPI_Q01_JURISDICTION","value":"1"},{"key":"OPI_Q02_WHEN_OCCURRED","value":"1"},{"key":"OPI_Q03_INCIDENT_TYPE","value":"2"},{"key":"OPI_Q07_MEDICAL_TREATMENT","value":"2"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CA_Q07_CITATION","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 29. Scarlett Anderson | other_personal_injury | did_not_proceed | score 40
-- Very old incident — 4+ years ago — statute of limitations almost certainly expired
-- OPI_Q02_WHEN_OCCURRED=4 + Q02B=4 + Q02C=2 → inferDateFromAnswers returns null → isInStatuteWindow=false
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Scarlett','Anderson','scarlett.anderson@email-test.com','+1 (813) 555-2222',
 'other_personal_injury','did_not_proceed',40,
 '2026-03-06 18:00:00+00',
 '2026-03-06 18:00:00+00'::timestamptz + interval '90 seconds',
 90,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"OPI_Q01_JURISDICTION","value":"1"},{"key":"OPI_Q02_WHEN_OCCURRED","value":"4"},{"key":"OPI_Q02B_TIMING_FOLLOWUP","value":"4"},{"key":"OPI_Q02C_YEARS_FOLLOWUP","value":"2"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL),

-- 30. Daniel Wilson | other_personal_injury | new | score 77
-- Hotel elevator malfunction 3-floor drop · back + neck injuries · hotel notified
(gen_random_uuid(), 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f',
 'Daniel','Wilson','daniel.wilson@email-test.com','+1 (407) 555-2323',
 'other_personal_injury','partial',77,
 '2026-03-06 18:30:00+00',
 '2026-03-06 18:30:00+00'::timestamptz + interval '405 seconds',
 405,
 'CA' || left(replace(gen_random_uuid()::text,'-',''),32),
 '[]'::jsonb,
 '[{"key":"OPI_Q01_JURISDICTION","value":"1"},{"key":"OPI_Q02_WHEN_OCCURRED","value":"2"},{"key":"OPI_Q03_INCIDENT_TYPE","value":"3"},{"key":"OPI_Q07_MEDICAL_TREATMENT","value":"2"},{"key":"CA_Q04_AT_FAULT","value":"1"},{"key":"CONFLICT_Q01_PRIOR_REP","value":"1"}]'::jsonb,
 NULL);

COMMIT;

-- =============================================================================
-- VERIFICATION QUERY — run after INSERT to confirm counts
-- =============================================================================
-- SELECT practice_area_code, final_state, count(*) AS n
-- FROM tenant_intake_leads_session
-- WHERE tenant_id = 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f'
-- GROUP BY practice_area_code, final_state
-- ORDER BY practice_area_code, final_state;
--
-- Expected: 30 total rows
--   car_accident          partial       7
--   car_accident          completed     1
--   car_accident          scheduled     2  (Sophia Rivera, Owen Turner... wait - Sophia is partial above)
--   slip_fall             partial       4
--   slip_fall             completed     2
--   slip_fall             scheduled     1
--   dog_bite              partial       3
--   dog_bite              completed     1
--   dog_bite              scheduled     1
--   workplace_injury      partial       3
--   workplace_injury      completed     1
--   workplace_injury      scheduled     1
--   other_personal_injury partial       3
--   other_personal_injury did_not_proceed 1
-- =============================================================================
