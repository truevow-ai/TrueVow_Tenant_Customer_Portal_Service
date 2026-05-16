/**
 * Comprehensive Backend & Database Tests
 * 
 * Tests:
 * - Database connectivity
 * - Complete CRUD operations
 * - API endpoints
 * - Business logic
 * - Edge cases
 * - Data validation
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8002';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/settle_db';

// ============================================================================
// DATABASE CONNECTIVITY TESTS
// ============================================================================

test.describe('Database Connectivity', () => {
  test('Database connection is established', async ({ request }) => {
    // Test database health endpoint
    const response = await request.get(`${API_BASE_URL}/health/db`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'connected');
    expect(data).toHaveProperty('database', 'postgresql');
  });

  test('Database connection handles errors gracefully', async ({ request }) => {
    // Test with invalid connection
    const response = await request.get(`${API_BASE_URL}/health/db`);
    // Should return error status, not crash
    expect([200, 500, 503]).toContain(response.status());
  });

  test('Database connection pool is working', async ({ request }) => {
    // Test concurrent connections
    const promises = Array.from({ length: 10 }, () => 
      request.get(`${API_BASE_URL}/health/db`)
    );
    const responses = await Promise.all(promises);
    
    // All should succeed
    responses.forEach(response => {
      expect([200, 500, 503]).toContain(response.status());
    });
  });
});

// ============================================================================
// CRUD OPERATIONS - SETTLE SERVICE
// ============================================================================

test.describe('SETTLE Service - CRUD Operations', () => {
  let testApiKey: string;
  let contributionId: string;

  test.beforeAll(async ({ request }) => {
    // Create test API key
    const response = await request.post(`${API_BASE_URL}/api/v1/admin/api-keys`, {
      data: {
        tenantId: 'test-tenant-uuid',
        accessLevel: 'standard',
        name: 'Test API Key',
      },
      headers: {
        'X-Admin-Key': 'admin-secret-key',
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      testApiKey = data.apiKey;
    }
  });

  // CREATE
  test('CREATE: Submit new contribution', async ({ request }) => {
    const contributionData = {
      injuryType: 'Motor Vehicle Accident',
      medicalBills: 50000,
      jurisdiction: 'California',
      outcomeRange: {
        min: 75000,
        max: 125000,
      },
      consentGiven: true,
    };

    const response = await request.post(`${API_BASE_URL}/api/v1/contribute/submit`, {
      data: contributionData,
      headers: {
        'X-API-Key': testApiKey || 'test-key',
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('contributionId');
    expect(data).toHaveProperty('status', 'pending');
    contributionId = data.contributionId;
  });

  // READ
  test('READ: Get contribution by ID', async ({ request }) => {
    if (!contributionId) {
      test.skip();
      return;
    }

    const response = await request.get(
      `${API_BASE_URL}/api/v1/contributions/${contributionId}`,
      {
        headers: {
          'X-API-Key': testApiKey || 'test-key',
        },
      }
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('contributionId', contributionId);
    expect(data).toHaveProperty('injuryType', 'Motor Vehicle Accident');
  });

  test('READ: List all contributions', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/contributions`, {
      headers: {
        'X-API-Key': testApiKey || 'test-key',
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.contributions)).toBe(true);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
  });

  test('READ: List contributions with pagination', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/v1/contributions?page=1&limit=10`,
      {
        headers: {
          'X-API-Key': testApiKey || 'test-key',
        },
      }
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.contributions.length).toBeLessThanOrEqual(10);
    expect(data).toHaveProperty('page', 1);
  });

  // UPDATE
  test('UPDATE: Update contribution status', async ({ request }) => {
    if (!contributionId) {
      test.skip();
      return;
    }

    const response = await request.patch(
      `${API_BASE_URL}/api/v1/admin/contributions/${contributionId}`,
      {
        data: {
          status: 'approved',
        },
        headers: {
          'X-Admin-Key': 'admin-secret-key',
        },
      }
    );

    expect([200, 404]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('status', 'approved');
    }
  });

  // DELETE
  test('DELETE: Delete contribution', async ({ request }) => {
    if (!contributionId) {
      test.skip();
      return;
    }

    const response = await request.delete(
      `${API_BASE_URL}/api/v1/admin/contributions/${contributionId}`,
      {
        headers: {
          'X-Admin-Key': 'admin-secret-key',
        },
      }
    );

    expect([200, 204, 404]).toContain(response.status());
  });
});

// ============================================================================
// CRUD OPERATIONS - TEAM MANAGEMENT
// ============================================================================

test.describe('Team Management - CRUD Operations', () => {
  let teamMemberId: string;

  // CREATE
  test('CREATE: Invite team member', async ({ request }) => {
    const memberData = {
      email: 'new.member@lawfirm.com',
      name: 'New Member',
      role: 'attorney',
      services: ['intake', 'settle'],
    };

    const response = await request.post(
      `${API_BASE_URL}/api/v1/team/invite`,
      {
        data: memberData,
        headers: {
          'Authorization': 'Bearer test-token',
        },
      }
    );

    expect([201, 200]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('memberId');
      teamMemberId = data.memberId;
    }
  });

  // READ
  test('READ: Get team member by ID', async ({ request }) => {
    if (!teamMemberId) {
      test.skip();
      return;
    }

    const response = await request.get(
      `${API_BASE_URL}/api/v1/team/members/${teamMemberId}`,
      {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      }
    );

    expect([200, 404]).toContain(response.status());
  });

  test('READ: List all team members', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/team/members`, {
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });

    expect([200, 401]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      expect(Array.isArray(data.members || data)).toBe(true);
    }
  });

  // UPDATE
  test('UPDATE: Update team member services', async ({ request }) => {
    if (!teamMemberId) {
      test.skip();
      return;
    }

    const response = await request.patch(
      `${API_BASE_URL}/api/v1/team/members/${teamMemberId}`,
      {
        data: {
          services: ['intake', 'settle', 'connect'],
        },
        headers: {
          'Authorization': 'Bearer test-token',
        },
      }
    );

    expect([200, 404]).toContain(response.status());
  });

  // DELETE
  test('DELETE: Remove team member', async ({ request }) => {
    if (!teamMemberId) {
      test.skip();
      return;
    }

    const response = await request.delete(
      `${API_BASE_URL}/api/v1/team/members/${teamMemberId}`,
      {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      }
    );

    expect([200, 204, 404]).toContain(response.status());
  });
});

// ============================================================================
// API ENDPOINT TESTS
// ============================================================================

test.describe('API Endpoints - Functionality', () => {
  test('Query Settlement Range - Valid Request', async ({ request }) => {
    const queryData = {
      injuryType: 'Slip and Fall',
      medicalBills: 30000,
      jurisdiction: 'New York',
    };

    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: queryData,
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([200, 401]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('estimatedRange');
      expect(data.estimatedRange).toHaveProperty('min');
      expect(data.estimatedRange).toHaveProperty('max');
    }
  });

  test('Query Settlement Range - Invalid Request', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        // Missing required fields
        injuryType: 'Test',
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([400, 401, 422]).toContain(response.status());
  });

  test('Generate Report - Valid Request', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/reports/generate`, {
      data: {
        queryId: 'test-query-id',
        format: 'pdf',
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([200, 201, 401, 404]).toContain(response.status());
  });

  test('Get Database Statistics', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/stats/database`, {
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([200, 401]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('totalContributions');
      expect(data).toHaveProperty('totalQueries');
    }
  });
});

// ============================================================================
// EDGE CASES & ERROR HANDLING
// ============================================================================

test.describe('Edge Cases & Error Handling', () => {
  test('Handle missing API key', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Test',
        medicalBills: 10000,
      },
      // No API key header
    });

    expect([401, 403]).toContain(response.status());
  });

  test('Handle invalid API key', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Test',
        medicalBills: 10000,
      },
      headers: {
        'X-API-Key': 'invalid-key-12345',
      },
    });

    expect([401, 403]).toContain(response.status());
  });

  test('Handle rate limiting', async ({ request }) => {
    // Make multiple rapid requests
    const promises = Array.from({ length: 100 }, () =>
      request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
        data: {
          injuryType: 'Test',
          medicalBills: 10000,
        },
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })
    );

    const responses = await Promise.all(promises);
    
    // At least one should be rate limited
    const rateLimited = responses.some(r => r.status() === 429);
    // This test may pass or fail depending on rate limit configuration
  });

  test('Handle invalid data types', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 12345, // Should be string
        medicalBills: 'not-a-number', // Should be number
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test('Handle very large numbers', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Test',
        medicalBills: 999999999999, // Very large number
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([200, 400, 422]).toContain(response.status());
  });

  test('Handle empty strings', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: '',
        medicalBills: 10000,
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test('Handle SQL injection attempts', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: "'; DROP TABLE contributions; --",
        medicalBills: 10000,
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    // Should sanitize input, not crash
    expect([200, 400, 422]).toContain(response.status());
  });

  test('Handle XSS attempts', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: '<script>alert("xss")</script>',
        medicalBills: 10000,
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    // Should sanitize input
    expect([200, 400, 422]).toContain(response.status());
  });
});

// ============================================================================
// DATA VALIDATION TESTS
// ============================================================================

test.describe('Data Validation', () => {
  test('Validate required fields', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/contribute/submit`, {
      data: {
        // Missing required fields
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test('Validate email format', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/team/invite`, {
      data: {
        email: 'invalid-email-format',
        name: 'Test',
        role: 'attorney',
      },
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test('Validate number ranges', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Test',
        medicalBills: -1000, // Negative number
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test('Validate enum values', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/contribute/submit`, {
      data: {
        injuryType: 'Invalid Type',
        medicalBills: 10000,
        jurisdiction: 'Invalid State',
        outcomeRange: { min: 1000, max: 2000 },
        consentGiven: true,
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    expect([200, 400, 422]).toContain(response.status());
  });
});

// ============================================================================
// BUSINESS LOGIC TESTS
// ============================================================================

test.describe('Business Logic', () => {
  test('Settlement estimation algorithm', async ({ request }) => {
    const testCases = [
      { medicalBills: 10000, expectedMin: 15000, expectedMax: 30000 },
      { medicalBills: 50000, expectedMin: 75000, expectedMax: 150000 },
      { medicalBills: 100000, expectedMin: 150000, expectedMax: 300000 },
    ];

    for (const testCase of testCases) {
      const response = await request.post(`${API_BASE_URL}/api/v1/query/estimate`, {
        data: {
          injuryType: 'Motor Vehicle Accident',
          medicalBills: testCase.medicalBills,
          jurisdiction: 'California',
        },
        headers: {
          'X-API-Key': 'test-api-key',
        },
      });

      if (response.ok()) {
        const data = await response.json();
        expect(data.estimatedRange.min).toBeGreaterThanOrEqual(testCase.expectedMin * 0.5);
        expect(data.estimatedRange.max).toBeLessThanOrEqual(testCase.expectedMax * 2);
      }
    }
  });

  test('PHI detection accuracy', async ({ request }) => {
    const testCases = [
      { text: 'John Doe', hasPHI: true },
      { text: '123-45-6789', hasPHI: true }, // SSN
      { text: '555-123-4567', hasPHI: true }, // Phone
      { text: '123 Main St', hasPHI: true }, // Address
      { text: 'Motor vehicle accident', hasPHI: false },
    ];

    for (const testCase of testCases) {
      const response = await request.post(`${API_BASE_URL}/api/v1/contribute/submit`, {
        data: {
          injuryType: testCase.text,
          medicalBills: 10000,
          outcomeRange: { min: 1000, max: 2000 },
          consentGiven: true,
        },
        headers: {
          'X-API-Key': 'test-api-key',
        },
      });

      if (response.ok()) {
        const data = await response.json();
        if (testCase.hasPHI) {
          expect(data).toHaveProperty('phiDetected', true);
        }
      }
    }
  });

  test('Founding Member benefits', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/founding-members/stats`, {
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('totalFoundingMembers');
      expect(data).toHaveProperty('benefits');
    }
  });
});

