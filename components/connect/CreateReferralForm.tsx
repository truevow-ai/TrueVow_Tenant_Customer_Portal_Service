'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { connectClient, type CreateReferralRequest } from '@/lib/api/connect-client';

export function CreateReferralForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateReferralRequest>({
    referredAttorneyEmail: '',
    referredAttorneyName: '',
    referredAttorneyFirm: '',
    caseType: '',
    jurisdiction: '',
    estimatedValue: undefined,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await connectClient.createReferral(formData);
      router.push('/dashboard/connect/referrals');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create referral');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Referred Attorney Email *
        </label>
        <input
          type="email"
          required
          value={formData.referredAttorneyEmail}
          onChange={(e) =>
            setFormData({ ...formData, referredAttorneyEmail: e.target.value })
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
          placeholder="attorney@lawfirm.com"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attorney Name *
          </label>
          <input
            type="text"
            required
            value={formData.referredAttorneyName}
            onChange={(e) =>
              setFormData({ ...formData, referredAttorneyName: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Law Firm *
          </label>
          <input
            type="text"
            required
            value={formData.referredAttorneyFirm}
            onChange={(e) =>
              setFormData({ ...formData, referredAttorneyFirm: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
            placeholder="Smith & Associates"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Case Type *
          </label>
          <input
            type="text"
            required
            value={formData.caseType}
            onChange={(e) =>
              setFormData({ ...formData, caseType: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
            placeholder="Personal Injury"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jurisdiction *
          </label>
          <input
            type="text"
            required
            value={formData.jurisdiction}
            onChange={(e) =>
              setFormData({ ...formData, jurisdiction: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
            placeholder="Maricopa County, AZ"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Estimated Case Value (Optional)
        </label>
        <input
          type="number"
          min="0"
          value={formData.estimatedValue || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              estimatedValue: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
          placeholder="50000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          rows={4}
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
          placeholder="Additional information about the referral..."
        />
      </div>

      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Referral'}
        </button>
      </div>
    </form>
  );
}

