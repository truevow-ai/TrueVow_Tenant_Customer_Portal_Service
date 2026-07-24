'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, Users, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { traceClient } from '@/lib/api/trace-client';

interface IntakeLead {
  lead_id: string;
  name: string;
  phone: string;
  email: string;
  practice_area?: string;
  state?: string;
  created_at: string;
}

const PRACTICE_AREAS: Record<string, string> = {
  auto_accident: 'Motor Vehicle Accident',
  motor_vehicle_accident: 'Motor Vehicle Accident',
  slip_fall: 'Slip and Fall',
  workplace_injury: 'Workplace Injury',
  workers_comp: 'Workplace Injury',
  medical_malpractice: 'Medical Malpractice',
  product_liability: 'Product Liability',
  dog_bite: 'Dog Bite',
  wrongful_death: 'Wrongful Death',
  premises_liability: 'Premises Liability',
};

export default function NewCasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipIntake = searchParams.get('skipIntake') === 'true';

  // Step tracking
  const [step, setStep] = useState<'retainer' | 'intake' | 'review'>(skipIntake ? 'review' : 'retainer');

  // Retainer
  const [retainerFile, setRetainerFile] = useState<File | null>(null);
  const [retainerName, setRetainerName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('standard');

  // Intake leads
  const [leads, setLeads] = useState<IntakeLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<IntakeLead | null>(null);

  // Manual entry (if no intake lead)
  const [clientName, setClientName] = useState('');
  const [clientDob, setClientDob] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [jurisdictionState, setJurisdictionState] = useState('CA');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    if (step === 'intake') fetchLeads();
  }, [step]);

  async function fetchLeads() {
    setLeadsLoading(true);
    try {
      const res = await fetch('/api/intake/leads?status=qualified&limit=20');
      const data = await res.json();
      const raw = data.leads || data.data || data;
      setLeads(Array.isArray(raw) ? raw : []);
    } catch { setLeads([]); }
    finally { setLeadsLoading(false); }
  }

  function selectLead(lead: IntakeLead) {
    setSelectedLead(lead);
    setClientName(lead.name);
    setClientPhone(lead.phone);
    setJurisdictionState(lead.state || 'CA');
  }

  async function handleCreate() {
    setError('');
    setSubmitting(true);
    try {
      const intakeId = crypto.randomUUID();
      const res = await traceClient.createCase({
        intake_record_id: intakeId,
        client_data: {
          name: clientName,
          dob: clientDob || '1980-01-01',
          address: clientAddress || 'Not provided',
          phone: clientPhone,
        },
        incident_date: incidentDate || new Date().toISOString().split('T')[0],
        jurisdiction_state: jurisdictionState,
        intake_statute: {
          sol_years: 2,
          reference: 'CCP 335.1',
          version: '2026',
        },
        provider_hints: [],
      });
      setCreated(res.case_id);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to create case');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Case Created</h2>
        <p className="text-gray-500 mb-6">Your TRACE case is ready. Upload the retainer agreement and send it for signing.</p>
        <div className="space-y-3">
          <Link href={`/dashboard/trace/cases/${created}`} className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A2463] text-white rounded-lg font-semibold hover:bg-[#0E3178]">
            Open Case <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">New TRACE Case</h1>
      <p className="text-sm text-gray-500 mb-6">Upload a retainer, select a prospect, and create the case.</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['retainer', 'intake', 'review'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-[#0A2463] text-white' : i < ['retainer', 'intake', 'review'].indexOf(step as any) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {i < ['retainer', 'intake', 'review'].indexOf(step as any) ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${step === s ? 'text-[#0A2463]' : 'text-gray-400'}`}>
              {s === 'retainer' ? 'Retainer' : s === 'intake' ? 'Prospect' : 'Review'}
            </span>
            {i < 2 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step: Retainer Upload */}
      {step === 'retainer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Upload Retainer Agreement</h3>

            {/* Template selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Or select a template</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="standard">Standard PI Retainer Agreement</option>
                <option value="contingency">Contingency Fee Agreement</option>
                <option value="hourly">Hourly Engagement Letter</option>
                <option value="custom">Custom Template (upload below)</option>
              </select>
            </div>

            {/* File upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#0A2463] transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setRetainerFile(f); setRetainerName(f.name); } }}
              onClick={() => document.getElementById('retainer-upload')?.click()}
            >
              <input id="retainer-upload" type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setRetainerFile(f); setRetainerName(f.name); } }}
              />
              <Upload size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                {retainerFile ? retainerName : 'Drag & drop your retainer PDF, or click to browse'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOC, or DOCX (max 10MB)</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(retainerFile || selectedTemplate !== 'custom' ? 'intake' : 'retainer')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0A2463] text-white rounded-lg font-semibold hover:bg-[#0E3178]">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step: Select Prospect from Intake */}
      {step === 'intake' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Select Prospect from INTAKE</h3>

            {leadsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0A2463]" /></div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users size={32} className="mx-auto mb-2" />
                <p className="text-sm">No qualified leads found</p>
                <button onClick={() => setStep('review')} className="mt-2 text-sm text-[#0A2463] hover:underline">
                  Enter client info manually
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {leads.map(lead => (
                  <div key={lead.lead_id}
                    onClick={() => selectLead(lead)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedLead?.lead_id === lead.lead_id ? 'border-[#0A2463] bg-blue-50' : 'border-gray-100 hover:border-gray-300'}`}
                  >
                    <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                    <p className="text-xs text-gray-500">{lead.phone} &middot; {lead.state} &middot; {PRACTICE_AREAS[lead.practice_area || ''] || lead.practice_area || 'General'}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setStep('review')} className="mt-4 text-sm text-[#0A2463] hover:underline">
              Enter client info manually
            </button>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('retainer')} className="text-sm text-gray-500 hover:underline">Back</button>
            <button onClick={() => setStep('review')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0A2463] text-white rounded-lg font-semibold hover:bg-[#0E3178]">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step: Review & Create */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Review &amp; Create Case</h3>

            {selectedLead && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-sm">
                <p className="font-medium text-blue-800">Converting from INTAKE</p>
                <p className="text-blue-600">{selectedLead.name} &middot; {selectedLead.phone}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Maria Rodriguez" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input value={clientDob} onChange={e => setClientDob(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="1985-04-12" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="+13235550198" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction State *</label>
                <select value={jurisdictionState} onChange={e => setJurisdictionState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incident Date *</label>
                <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="123 Main St, City, State" />
              </div>
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>The retainer will be populated with the client&apos;s name and information, then sent for e-signature after the case is created.</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep('intake')} className="text-sm text-gray-500 hover:underline">Back</button>
            <button onClick={handleCreate} disabled={submitting || !clientName || !clientPhone}
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#0A2463] text-white rounded-lg font-semibold hover:bg-[#0E3178] disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
