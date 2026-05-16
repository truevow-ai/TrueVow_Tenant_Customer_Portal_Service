'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FolderOpen, User, MapPin, Phone, Mail } from 'lucide-react';
import { leverageClient } from '@/lib/api/leverage-client';
import { useTenant } from '@/hooks/useTenant';
import { useCompanyToast } from '@/hooks/useCompanyToast';

const INCIDENT_TYPE_MAP: Record<string, string> = {
  auto_accident: 'Motor Vehicle Accident',
  motor_vehicle_accident: 'Motor Vehicle Accident',
  slip_fall: 'Slip and Fall',
  medical_malpractice: 'Medical Malpractice',
  product_liability: 'Product Liability',
  workplace_injury: 'Workplace Injury',
  workers_comp: 'Workplace Injury',
  dog_bite: 'Dog Bite',
  wrongful_death: 'Wrongful Death',
  premises_liability: 'Slip and Fall',
};

function mapPracticeAreaToIncident(pa: string | null): string {
  if (!pa) return 'Motor Vehicle Accident';
  const normalized = pa.toLowerCase().replace(/\s+/g, '_');
  return INCIDENT_TYPE_MAP[normalized] ?? 'Other';
}

function mapStatusToStage(status: string): string {
  if (status === 'retained') return 'retained';
  if (status === 'scheduled') return 'consult_scheduled';
  return 'lead';
}

interface LeadData {
  lead_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string;
  status: string;
  practice_area_code: string | null;
  state?: string;
  created_at: string;
  answers?: Array<{ question_key: string; response_value: string }>;
}

export default function NewCasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');
  const { tenantId } = useTenant();
  const toast = useCompanyToast();
  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState<LeadData | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);

  const [form, setForm] = useState({
    incident_type: 'Motor Vehicle Accident',
    state: 'CA',
    litigation_stage: 'lead',
  });

  const incidentTypes = [
    'Motor Vehicle Accident',
    'Slip and Fall',
    'Medical Malpractice',
    'Product Liability',
    'Workplace Injury',
    'Dog Bite',
    'Wrongful Death',
    'Other',
  ];

  const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  // Fetch lead data if leadId is present
  useEffect(() => {
    if (!leadId || !tenantId) return;
    setLeadLoading(true);
    fetch(`/api/intake/leads?tenant_id=${tenantId}&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        const found = (data.leads || []).find((l: any) => (l.lead_id || l.session_id) === leadId);
        if (found) {
          const leadData: LeadData = {
            lead_id: found.lead_id || found.session_id,
            first_name: found.first_name || '',
            last_name: found.last_name,
            email: found.email,
            phone: found.phone || '',
            status: found.status,
            practice_area_code: found.practice_area_code,
            created_at: found.created_at,
            answers: found.answers,
          };
          // Try to extract state from answers
          let stateFromLead = 'CA';
          if (found.answers) {
            const stateAnswer = found.answers.find((a: any) =>
              a.question_key?.toLowerCase().includes('state') ||
              a.question_key?.toLowerCase().includes('location')
            );
            if (stateAnswer?.response_value) {
              const possibleState = stateAnswer.response_value.toUpperCase().trim();
              if (states.includes(possibleState)) stateFromLead = possibleState;
            }
          }
          setLead(leadData);
          setForm({
            incident_type: mapPracticeAreaToIncident(found.practice_area_code),
            state: stateFromLead,
            litigation_stage: mapStatusToStage(found.status),
          });
        }
      })
      .catch(() => toast.error('Failed', 'Unable to load lead data.'))
      .finally(() => setLeadLoading(false));
  }, [leadId, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSubmitting(true);
    try {
      const res = await leverageClient.openCase({
        tenant_id: tenantId,
        incident_type: form.incident_type,
        state: form.state,
        litigation_stage: form.litigation_stage,
      });
      toast.success('Case Opened', `Case ${res.case_id} created successfully.`);
      router.push(`/dashboard/leverage/cases/${res.case_id}`);
    } catch {
      toast.error('Failed', 'Unable to open case. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage/cases" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">My Cases</Link>
          <span className="mx-1.5">›</span>
          <span>Open New Case</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {lead ? 'Convert Lead to Case' : 'Open New Case'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {lead ? `Converting lead: ${lead.first_name} ${lead.last_name ?? ''}` : 'Create a new case in LEVERAGE ($79 billing charge)'}
        </p>
      </div>

      {lead && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
            <User className="h-4 w-4" />
            <span className="font-medium">{lead.first_name} {lead.last_name ?? ''}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-blue-600 dark:text-blue-500">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
            {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>}
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.practice_area_code?.replace(/_/g, ' ') ?? 'Unknown'}</span>
          </div>
          <p className="text-xs text-blue-500">
            The form below is pre-filled from the intake data. Review and adjust before opening the case.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Incident Type</label>
          <select
            value={form.incident_type}
            onChange={(e) => setForm((f) => ({ ...f, incident_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            {incidentTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
          <select
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            {states.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Stage</label>
          <select
            value={form.litigation_stage}
            onChange={(e) => setForm((f) => ({ ...f, litigation_stage: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="lead">Lead</option>
            <option value="consult_scheduled">Consult Scheduled</option>
            <option value="retained">Retained</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !tenantId || leadLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            <FolderOpen className="h-4 w-4" />
            {submitting ? 'Opening...' : lead ? 'Convert Lead to Case ($79)' : 'Open Case ($79)'}
          </button>
        </div>
      </form>
    </div>
  );
}
