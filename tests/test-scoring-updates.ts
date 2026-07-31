/**
 * Test Script: Updated Scoring System Validation
 * 
 * Tests the new mandatory representation status and property damage severity
 */

import { calculateWeightedCompletion, calculateEconomicStrengthScore, isUnlockAvailable } from './lib/utils/case-scoring';

// ============================================================================
// TEST DATA
// ============================================================================

const testResponses = {
  // Complete case (should unlock)
  completeCase: [
    { question_key: 'jurisdiction', response_value: 'FL', response_type: 'select', captured_at: new Date().toISOString() },
    { question_key: 'incident_date', response_value: '2024-01-15', response_type: 'date', captured_at: new Date().toISOString() },
    { question_key: 'liability_description', response_value: 'Rear-ended at red light', response_type: 'text', captured_at: new Date().toISOString() },
    { question_key: 'treatment_description', response_value: 'ER + orthopedic follow-up', response_type: 'text', captured_at: new Date().toISOString() },
    { question_key: 'CONFLICT_Q01_PRIOR_REP', response_value: '1', response_type: 'select', captured_at: new Date().toISOString() }, // Not represented
    { question_key: 'injury_description', response_value: 'Herniated disc', response_type: 'text', captured_at: new Date().toISOString() },
    { question_key: 'lost_wages', response_value: 'Missed 2 weeks work', response_type: 'text', captured_at: new Date().toISOString() },
    { question_key: 'property_damage', response_value: 'Total loss - vehicle totaled', response_type: 'text', captured_at: new Date().toISOString() },
  ],

  // Represented client (should NOT unlock - ethical compliance)
  representedClient: [
    { question_key: 'jurisdiction', response_value: 'FL', response_type: 'select', captured_at: new Date().toISOString() },
    { question_key: 'incident_date', response_value: '2024-01-15', response_type: 'date', captured_at: new Date().toISOString() },
    { question_key: 'liability_description', response_value: 'Clear fault', response_type: 'text', captured_at: new Date().toISOString() },
    { question_key: 'treatment_description', response_value: 'Surgery scheduled', response_type: 'text', captured_at: new Date().toISOString() },
    { question_key: 'CONFLICT_Q01_PRIOR_REP', response_value: '3', response_type: 'select', captured_at: new Date().toISOString() }, // HIRED attorney
    { question_key: 'injury_description', response_value: 'Severe injury', response_type: 'text', captured_at: new Date().toISOString() },
    { question_key: 'lost_wages', response_value: 'Lost job', response_type: 'text', captured_at: new Date().toISOString() },
  ],

  // Missing mandatory signal (should NOT unlock)
  missingMandatory: [
    { question_key: 'jurisdiction', response_value: 'FL', response_type: 'select', captured_at: new Date().toISOString() },
    { question_key: 'incident_date', response_value: '2024-01-15', response_type: 'date', captured_at: new Date().toISOString() },
    { question_key: 'liability_description', response_value: 'Clear fault', response_type: 'text', captured_at: new Date().toISOString() },
    // Missing treatment_status (mandatory)
    { question_key: 'CONFLICT_Q01_PRIOR_REP', response_value: '1', response_type: 'select', captured_at: new Date().toISOString() },
    { question_key: 'injury_description', response_value: 'Minor injury', response_type: 'text', captured_at: new Date().toISOString() },
  ],

  // Property damage scenarios
  propertyDamageTests: [
    {
      name: 'Total Loss',
      responses: [{ question_key: 'property_damage', response_value: 'Vehicle totaled, structural damage', response_type: 'text', captured_at: new Date().toISOString() }]
    },
    {
      name: 'Significant Damage',
      responses: [{ question_key: 'property_damage', response_value: 'Airbag deployed, car towed', response_type: 'text', captured_at: new Date().toISOString() }]
    },
    {
      name: 'Moderate Damage',
      responses: [{ question_key: 'property_damage', response_value: 'Dent in bumper, scratch on door', response_type: 'text', captured_at: new Date().toISOString() }]
    },
    {
      name: 'Minor Damage',
      responses: [{ question_key: 'property_damage', response_value: 'Minor cosmetic scratch', response_type: 'text', captured_at: new Date().toISOString() }]
    },
  ]
};

// ============================================================================
// TEST EXECUTION
// ============================================================================

console.log('='.repeat(80));
console.log('TESTING UPDATED SCORING SYSTEM');
console.log('='.repeat(80));
console.log('\n');

// Test 1: Complete case (should unlock)
console.log('📋 TEST 1: Complete Case (Should Unlock)');
console.log('-'.repeat(80));
const completeResult = calculateWeightedCompletion(testResponses.completeCase);
const completeUnlock = isUnlockAvailable(testResponses.completeCase);
console.log(`Completion Score: ${completeResult.completion}%`);
console.log(`Unlock Available: ${completeUnlock.available}`);
console.log(`Missing Mandatory: ${completeUnlock.missingMandatoryFields.join(', ') || 'None'}`);
console.log(`Categories:`, completeResult.categories.map(c => `${c.label}: ${c.completed ? '✓' : '✗'}`).join(', '));
console.log('\n');

// Test 2: Represented client (should NOT unlock)
console.log('🚫 TEST 2: Represented Client (Should NOT Unlock - Ethical Compliance)');
console.log('-'.repeat(80));
const representedResult = calculateWeightedCompletion(testResponses.representedClient);
const representedUnlock = isUnlockAvailable(testResponses.representedClient);
console.log(`Completion Score: ${representedResult.completion}%`);
console.log(`Unlock Available: ${representedUnlock.available}`);
console.log(`Missing Mandatory: ${representedUnlock.missingMandatoryFields.join(', ') || 'None'}`);
console.log(`Representation Status: ${representedResult.coreSignals.representationStatus}`);
console.log('\n');

// Test 3: Missing mandatory signal
console.log('⚠️  TEST 3: Missing Mandatory Signal (Should NOT Unlock)');
console.log('-'.repeat(80));
const missingResult = calculateWeightedCompletion(testResponses.missingMandatory);
const missingUnlock = isUnlockAvailable(testResponses.missingMandatory);
console.log(`Completion Score: ${missingResult.completion}%`);
console.log(`Unlock Available: ${missingUnlock.available}`);
console.log(`Missing Mandatory: ${missingUnlock.missingMandatoryFields.join(', ') || 'None'}`);
console.log('\n');

// Test 4: Property damage scoring
console.log('💰 TEST 4: Property Damage Severity Scoring');
console.log('-'.repeat(80));
testResponses.propertyDamageTests.forEach(test => {
  const economicScore = calculateEconomicStrengthScore(test.responses);
  console.log(`${test.name}: ${economicScore.totalScore} points (${economicScore.signals.propertyDamageLevel})`);
});
console.log('\n');

// Test 5: Economic strength comparison (old vs new)
console.log('📊 TEST 5: Economic Strength - Old vs New Model');
console.log('-'.repeat(80));
const fullCaseResponses = [
  { question_key: 'treatment_description', response_value: 'Surgery scheduled', response_type: 'text', captured_at: new Date().toISOString() },
  { question_key: 'injury_description', response_value: 'Herniated disc', response_type: 'text', captured_at: new Date().toISOString() },
  { question_key: 'lost_wages', response_value: 'Lost job', response_type: 'text', captured_at: new Date().toISOString() },
  { question_key: 'liability_description', response_value: 'Cited + DUI', response_type: 'text', captured_at: new Date().toISOString() },
  { question_key: 'insurance', response_value: 'Commercial policy', response_type: 'text', captured_at: new Date().toISOString() },
  { question_key: 'evidence', response_value: 'Police report + photos', response_type: 'text', captured_at: new Date().toISOString() },
  { question_key: 'property_damage', response_value: 'Total loss', response_type: 'text', captured_at: new Date().toISOString() },
];

const economicScore = calculateEconomicStrengthScore(fullCaseResponses);
console.log(`Total Score: ${economicScore.totalScore}/100`);
console.log(`Tier: ${economicScore.tier}`);
console.log('Components:');
Object.entries(economicScore.components).forEach(([key, value]) => {
  console.log(`  - ${key}: ${value.score} pts (weight: ${value.weight}%)`);
});
console.log('\n');

console.log('='.repeat(80));
console.log('✅ ALL TESTS COMPLETED');
console.log('='.repeat(80));
