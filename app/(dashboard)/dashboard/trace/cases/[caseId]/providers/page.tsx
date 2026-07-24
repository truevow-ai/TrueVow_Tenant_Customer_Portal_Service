'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Phone, Trash2, Check, X } from 'lucide-react';
import { traceClient, TraceProvider } from '@/lib/api/trace-client';

export default function ProvidersPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [providers, setProviders] = useState<TraceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [name, setName] = useState('');
  const [npi, setNpi] = useState('');
  const [fax, setFax] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [facility, setFacility] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await traceClient.listProviders(caseId as string);
        setProviders(res.providers || []);
      } catch { }
      finally { setLoading(false); }
    }
    load();
  }, [caseId]);

  async function handleAdd() {
    if (!name) return;
    setSaving(true);
    try {
      const p = await traceClient.addProvider(caseId as string, {
        provider_name: name,
        npi_number: npi || undefined,
        fax_number: fax || undefined,
        specialty: specialty || undefined,
        facility_name: facility || undefined,
      } as any);
      setProviders([...providers, p]);
      setShowAdd(false);
      setName(''); setNpi(''); setFax(''); setSpecialty(''); setFacility('');
    } catch { }
    finally { setSaving(false); }
  }

  async function toggleConfirm(prov: TraceProvider) {
    try {
      const updated = await traceClient.updateProvider(caseId as string, prov.provider_id, {
        provider_name: prov.provider_name,
        npi_number: prov.npi_number,
        fax_number: prov.fax_number,
        facility_name: prov.facility_name,
        confirmation_status: prov.confirmation_status === 'CONFIRMED' ? 'UNCONFIRMED' : 'CONFIRMED',
      } as any);
      setProviders(providers.map(p => p.provider_id === updated.provider_id ? updated : p));
    } catch { }
  }

  async function handleLock() {
    try {
      await traceClient.confirmProviderList(caseId as string);
      router.refresh();
      alert('Provider list locked. No more edits allowed.');
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Could not lock provider list');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/trace/cases/${caseId}`} className="text-sm text-gray-500 hover:text-[#0A2463] flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Case
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-sm text-gray-500">{providers.length} provider{providers.length !== 1 ? 's' : ''} &middot; {caseId}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2463] text-white rounded-lg text-sm font-semibold hover:bg-[#0E3178]">
            <Plus size={16} /> Add Provider
          </button>
          <button onClick={handleLock}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#0A2463] text-[#0A2463] rounded-lg text-sm font-semibold hover:bg-[#0A2463]/5">
            <Check size={16} /> Lock List
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Provider Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Cedars-Sinai Medical Center" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">NPI Number</label>
              <input value={npi} onChange={e => setNpi(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="1346255124" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fax Number</label>
              <input value={fax} onChange={e => setFax(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="3104238000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Specialty</label>
              <input value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Emergency Medicine" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Facility Name</label>
              <input value={facility} onChange={e => setFacility(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Main Campus" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !name}
              className="px-4 py-1.5 bg-[#0A2463] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Provider List */}
      {providers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-2 text-gray-300"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p>No providers added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map(p => (
            <div key={p.provider_id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{p.provider_name}</h4>
                  {p.extraction_confidence && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.extraction_confidence === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.extraction_confidence}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  {p.specialty && <span>{p.specialty}</span>}
                  {p.facility_name && <span>{p.facility_name}</span>}
                  {p.npi_number && <span>NPI: {p.npi_number}</span>}
                </div>
                {p.fax_number && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <Phone size={12} /> {p.fax_number}
                  </div>
                )}
              </div>
              <button onClick={() => toggleConfirm(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${p.confirmation_status === 'CONFIRMED' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {p.confirmation_status === 'CONFIRMED' ? <><Check size={12} className="inline mr-1" /> Confirmed</> : 'Confirm'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


