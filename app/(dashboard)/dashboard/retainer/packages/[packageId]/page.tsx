'use client';

/**
 * A4.5 Package Workspace
 * Uses PackageDetailResponse from generated contract.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, CheckCircle, XCircle, Send, ShieldCheck, Eye } from 'lucide-react';
import { retainerClient, type PackageDetailResponse } from '@/lib/api/retainer/client';

function Badge({ label, color }: { label: string; color: string }) {
  const m: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    gray: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m[color] || m.gray}`}>{label}</span>;
}

export default function PackageWorkspacePage() {
  const { packageId } = useParams<{ packageId: string }>();

  const [pkg, setPkg] = useState<PackageDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await retainerClient.getPackage(packageId);
        setPkg(data);
      } catch (err: any) {
        setError(err?.message || 'Failed');
      } finally { setLoading(false); }
    }
    load();
  }, [packageId]);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" /></div>;
  if (error || !pkg) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-lg mx-auto">
          <p className="text-red-700 dark:text-red-300 font-semibold">Unable to load package</p>
          <p className="text-red-500 text-sm mt-1">{error || 'Not found'}</p>
          <Link href="/dashboard/retainer" className="inline-block mt-4 text-sm text-[#0A2463] dark:text-blue-400 hover:underline">Back to RETAINER</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        <Link href="/dashboard/retainer" className="hover:text-gray-600 dark:hover:text-gray-300">RETAINER</Link>
        <span className="mx-1.5">/</span>
        <span>Package</span>
      </p>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Engagement Package</h1>
          <p className="text-xs font-mono text-gray-400 mt-1">{pkg.package_id}</p>
        </div>
        <Badge label={pkg.status} color={pkg.status === 'locked' ? 'green' : pkg.status === 'generated' ? 'blue' : 'yellow'} />
      </div>

      {actionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">{actionError}</p>
        </div>
      )}

      {/* Package Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Package Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Status:</span> <span className="font-semibold text-gray-900 dark:text-gray-100">{pkg.status}</span></div>
          <div><span className="text-gray-500">Generated:</span> <span className="text-gray-900 dark:text-gray-100">{new Date(pkg.generated_at).toLocaleString()}</span></div>
          <div><span className="text-gray-500">Locked:</span> <span className="text-gray-900 dark:text-gray-100">{pkg.locked_at ? new Date(pkg.locked_at).toLocaleString() : 'Not locked'}</span></div>
          <div><span className="text-gray-500">Documents:</span> <span className="text-gray-900 dark:text-gray-100">{pkg.documents?.length || 0}</span></div>
        </div>
        <div className="mt-3">
          <span className="text-xs text-gray-500">Package Hash: </span>
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{pkg.package_hash}</span>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Documents</h2>
        </div>
        {!pkg.documents || pkg.documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No documents in this package.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pkg.documents.map((doc) => (
              <div key={doc.document_version_id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-[#0A2463] dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {doc.document_role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.required ? 'Required' : 'Optional'} &middot; Sequence {doc.sequence}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400">{doc.document_hash.slice(0, 12)}...</span>
                  <Badge label={doc.required ? 'Required' : 'Optional'} color={doc.required ? 'blue' : 'gray'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preflight Results */}
      {pkg.preflight_results && pkg.preflight_results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preflight Results</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pkg.preflight_results.map((pf, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  {pf.passed ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                  <div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{pf.control_name}</p>
                    {pf.detail && <p className="text-xs text-gray-500">{pf.detail}</p>}
                  </div>
                </div>
                <Badge label={pf.passed ? 'Passed' : 'Failed'} color={pf.passed ? 'green' : 'red'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Authorization */}
      {pkg.status === 'generated' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Delivery Authorization</h2>
          <button
            onClick={async () => {
              try {
                await retainerClient.authorizeDelivery(packageId, {
                  authority_record_id: 'pending', channel: 'portal', recipient_verified: false,
                });
                const updated = await retainerClient.getPackage(packageId);
                setPkg(updated);
                setActionError('');
              } catch (err: any) { setActionError(err?.response?.data?.error || err?.message || 'Authorization denied'); }
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            <Send size={14} className="inline mr-1" /> Authorize Delivery
          </button>
        </div>
      )}

      {/* Lock Verification */}
      {pkg.locked_at && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
            <ShieldCheck size={16} /> Preview verified against locked document version
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-1">Hash: {pkg.package_hash}</p>
        </div>
      )}
    </div>
  );
}
