/**
 * Permitted Customer Portal → RETAINER route registry.
 * Every path must be explicitly allowlisted with its permitted HTTP methods
 * and required authority class.
 *
 * Source authority mapping from: registries/authority_actions.yaml
 * Source endpoint mapping from: OpenAPI + FastAPI route files
 */
import type { AuthorityClass } from './generated/schema';

export interface AllowedRoute {
  pattern: string;
  methods: string[];
  authority: AuthorityClass;
  description: string;
}

/**
 * Allowed internal (Customer Portal) routes.
 * Public portal routes (token-based) are NOT included.
 * Webhook/callback routes are NOT included.
 * Internal worker routes are NOT included.
 * Database administration is NOT included.
 * Cross-tenant admin is NOT included.
 */
export const ALLOWED_ROUTES: AllowedRoute[] = [
  // Review queue
  {
    pattern: 'GET /review-queue',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get review queue (approval pending)',
  },

  // Candidates
  {
    pattern: 'GET /candidates',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'List all candidates for tenant',
  },
  {
    pattern: 'GET /candidates/:id',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get candidate detail',
  },
  {
    pattern: 'POST /candidates/:id/decisions',
    methods: ['POST'],
    authority: 'ATTY_AUTH',
    description: 'Record representation decision (APPROVE/DECLINE/DEFER)',
  },
  {
    pattern: 'GET /candidates/:id/audit',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get candidate audit trail',
  },

  // Workflows
  {
    pattern: 'GET /workflows/:id',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get workflow detail',
  },
  {
    pattern: 'GET /workflows/:id/timeline',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get workflow event timeline',
  },
  {
    pattern: 'GET /workflows/:id/trace-manifest',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Generate TRACE handoff manifest',
  },
  {
    pattern: 'GET /workflows/:id/policy-compliance',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Validate policy compliance',
  },
  {
    pattern: 'GET /workflows/:id/health',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get workflow health',
  },

  // Conflict searches
  {
    pattern: 'POST /candidates/:id/conflicts/search',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Start conflict search',
  },
  {
    pattern: 'GET /conflicts/searches/:id',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get conflict search detail',
  },
  {
    pattern: 'POST /conflicts/:id/clear',
    methods: ['POST'],
    authority: 'ATTY_AUTH',
    description: 'Clear conflict review',
  },
  {
    pattern: 'POST /workflows/:id/conflict-holds',
    methods: ['POST'],
    authority: 'ATTY_AUTH',
    description: 'Apply conflict hold',
  },
  {
    pattern: 'DELETE /conflict-holds/:id',
    methods: ['DELETE'],
    authority: 'ATTY_AUTH',
    description: 'Release conflict hold',
  },
  {
    pattern: 'POST /candidates/:id/conflicts/rerun',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Rerun conflict search',
  },
  {
    pattern: 'GET /conflicts/searches/:id/audit',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get conflict audit trail',
  },

  // Templates & Packages
  {
    pattern: 'POST /workflows/:id/templates/resolve',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Resolve engagement template',
  },
  {
    pattern: 'POST /workflows/:id/packages',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Generate engagement package',
  },
  {
    pattern: 'GET /packages/:id',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get package detail',
  },
  {
    pattern: 'POST /packages/:id/authorize-delivery',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Authorize package delivery',
  },

  // Signatures (firm-facing)
  {
    pattern: 'POST /packages/:id/ceremonies',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Create signature ceremony',
  },
  {
    pattern: 'GET /ceremonies/:id',
    methods: ['GET'],
    authority: 'STAFF_AUTH',
    description: 'Get ceremony detail',
  },
  {
    pattern: 'POST /ceremonies/:id/mark-executed',
    methods: ['POST'],
    authority: 'ATTY_AUTH',
    description: 'Mark ceremony fully executed',
  },

  // Operations
  {
    pattern: 'POST /workflows/:id/reminders',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Create reminder schedule',
  },
  {
    pattern: 'POST /reminders/:id/send',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Send reminder',
  },
  {
    pattern: 'POST /reminders/:id/suppress',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Suppress reminders',
  },
  {
    pattern: 'POST /workflows/:id/expire',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Expire engagement',
  },
  {
    pattern: 'POST /workflows/:id/activation-checklist',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Create activation checklist',
  },
  {
    pattern: 'POST /checklist-items/:id/evaluate',
    methods: ['POST'],
    authority: 'STAFF_AUTH',
    description: 'Evaluate checklist item',
  },
  {
    pattern: 'POST /checklists/:id/authorize',
    methods: ['POST'],
    authority: 'ATTY_AUTH',
    description: 'Authorize activation',
  },
  {
    pattern: 'POST /workflows/:id/activate',
    methods: ['POST'],
    authority: 'FIRM_POLICY',
    description: 'Confirm matter activated',
  },
];

/**
 * Check if a given method + path is in the allowlist.
 * Pattern matching supports :param placeholders.
 */
export function isRouteAllowed(method: string, path: string): AllowedRoute | null {
  for (const route of ALLOWED_ROUTES) {
    const [routeMethod, routePattern] = route.pattern.split(' ', 2);
    if (routeMethod !== method) continue;

    const routeParts = routePattern.split('/');
    const pathParts = path.replace(/^\//, '').split('/');

    if (routeParts.length !== pathParts.length) continue;

    let match = true;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) continue; // param placeholder
      if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }
    if (match) return route;
  }
  return null;
}
