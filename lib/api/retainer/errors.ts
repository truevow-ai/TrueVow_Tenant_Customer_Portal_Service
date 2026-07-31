/**
 * RETAINER error code mapping.
 * Maps backend error codes to safe Customer Portal responses.
 * Never exposes internal infrastructure details.
 */

export type RetainerErrorCode =
  | 'RET_AUTHORITY_MISSING'
  | 'RET_STATE_CONFLICT'
  | 'RET_TENANT_MISMATCH'
  | 'RET_POLICY_INACTIVE'
  | 'RET_TEMPLATE_UNRESOLVED'
  | 'RET_PREFLIGHT_FAILED'
  | 'RET_CONSENT_NOT_EFFECTIVE'
  | 'RET_SIGNATURE_INVALID'
  | 'RET_ACTIVATION_UNKNOWN'
  | 'RET_CANDIDATE_NOT_FOUND'
  | 'RET_VERSION_CONFLICT'
  | 'RET_INVALID_REQUEST';

export const RETAINER_ERROR_MESSAGES: Record<RetainerErrorCode, string> = {
  RET_AUTHORITY_MISSING: 'You do not have the required authority for this action.',
  RET_STATE_CONFLICT: 'This action cannot be performed in the current workflow state.',
  RET_TENANT_MISMATCH: 'The requested resource does not belong to your tenant.',
  RET_POLICY_INACTIVE: 'The required policy is not active. Contact your administrator.',
  RET_TEMPLATE_UNRESOLVED: 'The engagement template could not be resolved. Check required fields.',
  RET_PREFLIGHT_FAILED: 'One or more preflight checks failed. Review the package before proceeding.',
  RET_CONSENT_NOT_EFFECTIVE: 'Electronic consent has not been granted or has expired.',
  RET_SIGNATURE_INVALID: 'The signature cannot be validated or has been invalidated.',
  RET_ACTIVATION_UNKNOWN: 'The activation requirements have not been satisfied.',
  RET_CANDIDATE_NOT_FOUND: 'The requested candidate was not found.',
  RET_VERSION_CONFLICT: 'The resource version is outdated. Refresh and try again.',
  RET_INVALID_REQUEST: 'The request contains invalid or missing fields.',
};

export function mapRetainerError(detail: unknown): { code: RetainerErrorCode; message: string } {
  if (typeof detail === 'string') {
    const normalized = detail.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    for (const code of Object.keys(RETAINER_ERROR_MESSAGES) as RetainerErrorCode[]) {
      if (normalized.includes(code)) {
        return { code, message: RETAINER_ERROR_MESSAGES[code] };
      }
    }
  }
  return { code: 'RET_INVALID_REQUEST', message: RETAINER_ERROR_MESSAGES.RET_INVALID_REQUEST };
}
