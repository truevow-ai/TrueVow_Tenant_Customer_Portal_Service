'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Bell, Key, Building2, Loader2, AlertCircle, Phone, FileText, Clock, MessageCircle, PhoneForwarded, Plus, X, ChevronDown, Pencil, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { US_COUNTIES } from '@/lib/utils/us-counties';
import Link from 'next/link';
import { useClerk, useUser } from '@clerk/nextjs';
import { useTenantDev } from '@/hooks/useTenant';
import { Events } from '@/lib/analytics/events';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  whatsApp: string;
}

interface FirmInfo {
  name: string;
  website: string;
  practiceArea: string;
  subSpecialization: string[];
  firmSize: string;
  barNumber: string;
  barState: string;
  state: string;
  zipCode: string;
  county: string;
  monthlyCallVolume: string;
  address: string;
  city: string;
  billingEmail: string;
}

interface PhoneLine {
  id: string;
  label: string;
  number: string;
  forwardTo: string;
}

interface NotificationPrefs {
  newLead: boolean;
  highPriorityLead: boolean;
  responseWarning: boolean;
  responseWarningMinutes: number;
}

interface CallSettings {
  recording_enabled: boolean;
  transcription_enabled: boolean;
}

// ── Sub-specializations per practice area ─────────────────────────────────────
const SUB_SPECIALIZATIONS: Record<string, { value: string; label: string }[]> = {
  personal_injury: [
    { value: 'auto_accident', label: 'Auto / Motor Vehicle Accident' },
    { value: 'truck_accident', label: 'Truck / Commercial Vehicle Accident' },
    { value: 'slip_fall', label: 'Slip & Fall / Premises Liability' },
    { value: 'dog_bite', label: 'Dog Bite' },
    { value: 'workplace_injury', label: 'Workplace Injury' },
    { value: 'wrongful_death', label: 'Wrongful Death' },
    { value: 'product_liability', label: 'Product Liability' },
    { value: 'rideshare', label: 'Rideshare Accident (Uber / Lyft)' },
    { value: 'pedestrian', label: 'Pedestrian / Bicycle Accident' },
  ],
  medical_malpractice: [
    { value: 'surgical_errors', label: 'Surgical Errors' },
    { value: 'misdiagnosis', label: 'Misdiagnosis / Delayed Diagnosis' },
    { value: 'birth_injuries', label: 'Birth Injuries' },
    { value: 'medication_errors', label: 'Medication Errors' },
    { value: 'anesthesia', label: 'Anesthesia Errors' },
    { value: 'hospital_negligence', label: 'Hospital Negligence' },
  ],
  employment: [
    { value: 'wrongful_termination', label: 'Wrongful Termination' },
    { value: 'discrimination', label: 'Discrimination' },
    { value: 'harassment', label: 'Sexual Harassment' },
    { value: 'wage_hour', label: 'Wage & Hour Violations' },
    { value: 'fmla', label: 'FMLA Violations' },
    { value: 'retaliation', label: 'Retaliation' },
  ],
  family: [
    { value: 'divorce', label: 'Divorce' },
    { value: 'child_custody', label: 'Child Custody' },
    { value: 'child_support', label: 'Child Support' },
    { value: 'adoption', label: 'Adoption' },
    { value: 'domestic_violence', label: 'Domestic Violence' },
    { value: 'prenuptial', label: 'Prenuptial Agreements' },
  ],
  criminal: [
    { value: 'dui', label: 'DUI / DWI' },
    { value: 'drug_offenses', label: 'Drug Offenses' },
    { value: 'assault', label: 'Assault / Battery' },
    { value: 'white_collar', label: 'White Collar Crime' },
    { value: 'juvenile', label: 'Juvenile Defense' },
    { value: 'federal', label: 'Federal Crimes' },
  ],
  immigration: [
    { value: 'asylum', label: 'Asylum' },
    { value: 'deportation', label: 'Deportation Defense' },
    { value: 'work_visas', label: 'Work Visas (H-1B, L-1, O-1)' },
    { value: 'family_petitions', label: 'Family Petitions' },
    { value: 'naturalization', label: 'Naturalization / Citizenship' },
    { value: 'daca', label: 'DACA' },
  ],
  real_estate: [
    { value: 'residential', label: 'Residential Transactions' },
    { value: 'commercial', label: 'Commercial Transactions' },
    { value: 'landlord_tenant', label: 'Landlord-Tenant Disputes' },
    { value: 'foreclosure', label: 'Foreclosure' },
    { value: 'construction', label: 'Construction Disputes' },
  ],
  business: [
    { value: 'contract_disputes', label: 'Contract Disputes' },
    { value: 'formation', label: 'Business Formation' },
    { value: 'ma', label: 'Mergers & Acquisitions' },
    { value: 'ip', label: 'Intellectual Property' },
    { value: 'employment_disputes', label: 'Employment Disputes' },
  ],
  other: [{ value: 'general', label: 'General Practice' }],
};

const TRUEVOW_LINES = [
  { id: 'benjamin_en_1', label: 'Benjamin Agent 01 — English (Primary)' },
  { id: 'benjamin_en_2', label: 'Benjamin Agent 02 — English (Secondary)' },
  { id: 'benjamin_es_1', label: 'Benjamin Agent — Spanish' },
];

// Optional integrations the firm can express interest in during onboarding
const INTEGRATION_OPTIONS = [
  { id: 'clio',           label: 'Clio Manage',               desc: 'Sync leads as matters, push contact data' },
  { id: 'lawmatics',     label: 'Lawmatics',                 desc: 'CRM & intake automation sync' },
  { id: 'practicepanther',label: 'PracticePanther',          desc: 'Case management sync' },
  { id: 'gmail',          label: 'Gmail (Google Workspace)', desc: 'Track outreach activity' },
  { id: 'outlook',        label: 'Microsoft Outlook / 365',  desc: 'Track outreach activity' },
  { id: 'salesforce',     label: 'Salesforce (Legal CRM)',   desc: 'Lead & contact pipeline sync' },
];

const DEFAULT_PHONE_LINES: PhoneLine[] = [
  { id: 'switchboard', label: 'Main Switchboard / Receptionist', number: '', forwardTo: '' },
  { id: 'main', label: 'Law Firm Main Number', number: '', forwardTo: '' },
  { id: 'campaign_01', label: 'Campaign Phone Number 01', number: '', forwardTo: '' },
  { id: 'campaign_02', label: 'Campaign Phone Number 02', number: '', forwardTo: '' },
];

const EMPTY_FIRM: FirmInfo = { name:'', website:'', practiceArea:'', subSpecialization:[], firmSize:'', barNumber:'', barState:'', state:'', zipCode:'', county:'', monthlyCallVolume:'', address:'', city:'', billingEmail:'' };
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function formatPhone(raw: string): string {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  // For 10+ digits always take the last 10 (handles accidental extra digits)
  const d = digits.length >= 10 ? digits.slice(-10) : digits;
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return raw; // too short — return as typed
}

export default function SettingsPage() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenantDev();
  const { openUserProfile } = useClerk();
  const { user: clerkUser } = useUser();
  // Clerk is the authoritative source for identity — always visible, never empty
  const clerkEmail     = clerkUser?.emailAddresses[0]?.emailAddress || '';
  const clerkFirstName = clerkUser?.firstName || '';
  const clerkLastName  = clerkUser?.lastName  || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firmInfo, setFirmInfo] = useState<FirmInfo | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() => {
    if (typeof window === 'undefined') return { newLead: true, highPriorityLead: true, responseWarning: false, responseWarningMinutes: 15 };
    try {
      const stored = localStorage.getItem('tv_notification_prefs');
      return stored ? JSON.parse(stored) : { newLead: true, highPriorityLead: true, responseWarning: false, responseWarningMinutes: 15 };
    } catch { return { newLead: true, highPriorityLead: true, responseWarning: false, responseWarningMinutes: 15 }; }
  });

  // Call settings — default both OFF per compliance best-practice
  const [callSettings, setCallSettings] = useState<CallSettings>(() => {
    if (typeof window === 'undefined') return { recording_enabled: false, transcription_enabled: false };
    try {
            const stored = localStorage.getItem('tv_call_settings_v2');
      return stored ? JSON.parse(stored) : { recording_enabled: false, transcription_enabled: false };
    } catch { return { recording_enabled: false, transcription_enabled: false }; }
  });
  const [callSettingsSaved, setCallSettingsSaved] = useState(false);
  const [subSpecOpen, setSubSpecOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [integrationInterests, setIntegrationInterests] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');

  // Edit-mode state for Profile and Firm sections
  const [profileEditing, setProfileEditing] = useState(false);
  const [firmEditing, setFirmEditing] = useState(false);
  // Snapshot of last-saved values — used by Cancel to revert unsaved edits
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null);
  const [savedFirmInfo, setSavedFirmInfo] = useState<FirmInfo | null>(null);

  // Outbound caller ID — persisted to localStorage
  const [outboundNumber, setOutboundNumber] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('tv_outbound_number') || '';
  });

  // Counties for the Primary County dropdown (state-filtered from SaaS Admin)
  const [counties, setCounties] = useState<{ id: string; name: string; isFull: boolean }[]>([]);
  const [countiesLoading, setCountiesLoading] = useState(false);

  // Fetch settings from SaaS Admin on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (tenantLoading) return;
      if (!tenantId) {
        setError(tenantError || 'No tenant context available');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/settings/profile?tenant_id=${tenantId}`);
        if (res.ok) {
          const data = await res.json();

          // ── Build firm info ────────────────────────────────────────────────
          const fi: FirmInfo = {
            ...EMPTY_FIRM,
            name:               data.firmName || '',
            website:            data.website || '',
            practiceArea:       data.practiceArea || '',
            subSpecialization:  Array.isArray(data.subSpecialization) ? data.subSpecialization : [],
            firmSize:           data.firmSize || '',
            barNumber:          data.barNumber || '',
            barState:           data.barState || '',
            state:              data.state || '',
            zipCode:            data.zipCode || '',
            county:             data.county || '',
            monthlyCallVolume:  data.monthlyCallVolume || '',
            address:            data.address || '',
            city:               data.city || '',
            billingEmail:       data.billingEmail || '',
          };

          // ── Build profile ──────────────────────────────────────────────────
          const p: UserProfile = {
            id:        tenantId,
            firstName: data.firstName || clerkFirstName,
            lastName:  data.lastName  || clerkLastName,
            fullName:  `${data.firstName || clerkFirstName} ${data.lastName || clerkLastName}`.trim(),
            // Clerk is the authoritative source for email — always show it
            email:     clerkEmail || data.email || '',
            phone:     data.phone || '',
            whatsApp:  data.whatsapp || '',
          };

          // ── Pending sync: push changes saved while server was down ─────────
          const pendingFirmSync    = localStorage.getItem('tv_pending_firm_sync');
          const pendingProfileSync = localStorage.getItem('tv_pending_profile_sync');

          if (pendingFirmSync || pendingProfileSync) {
            // Server is back — silently re-push the queued saves
            setSyncStatus('syncing');
            const syncs: Promise<void>[] = [];
            if (pendingFirmSync) {
              syncs.push(
                fetch('/api/settings/profile', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: pendingFirmSync,
                }).then(r => { if (r.ok) localStorage.removeItem('tv_pending_firm_sync'); })
                  .catch(() => {})
              );
            }
            if (pendingProfileSync) {
              syncs.push(
                fetch('/api/settings/profile', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: pendingProfileSync,
                }).then(r => { if (r.ok) localStorage.removeItem('tv_pending_profile_sync'); })
                  .catch(() => {})
              );
            }
            Promise.all(syncs)
              .then(() => { setSyncStatus('synced'); setTimeout(() => setSyncStatus('idle'), 5000); })
              .catch(() => setSyncStatus('failed'));
            // Use localStorage — it is more recent than what server just returned
            const cachedFirm    = localStorage.getItem('tv_settings_firm');
            const cachedProfile = localStorage.getItem('tv_settings_profile');
            setFirmInfo(cachedFirm    ? JSON.parse(cachedFirm)    : fi);    setSavedFirmInfo(cachedFirm    ? JSON.parse(cachedFirm)    : fi);
            setProfile(cachedProfile  ? JSON.parse(cachedProfile) : p);    setSavedProfile(cachedProfile  ? JSON.parse(cachedProfile) : p);
          } else {
            // Normal path — server data is authoritative, cache it
            const hasMeaningfulData = !!(data.firmName || data.firstName || data.phone || data.website);
            if (hasMeaningfulData) {
              localStorage.setItem('tv_settings_firm', JSON.stringify(fi));
              localStorage.setItem('tv_settings_profile', JSON.stringify(p));
            }
            const cachedFirm    = localStorage.getItem('tv_settings_firm');
            const cachedProfile = localStorage.getItem('tv_settings_profile');
            setFirmInfo(cachedFirm    ? JSON.parse(cachedFirm)    : fi);    setSavedFirmInfo(cachedFirm    ? JSON.parse(cachedFirm)    : fi);
            setProfile(cachedProfile  ? JSON.parse(cachedProfile) : p);    setSavedProfile(cachedProfile  ? JSON.parse(cachedProfile) : p);
          }
        } else {
          // Non-fatal: try local cache
          const cachedFirm    = localStorage.getItem('tv_settings_firm');
          const cachedProfile = localStorage.getItem('tv_settings_profile');
          setFirmInfo(cachedFirm    ? JSON.parse(cachedFirm)    : EMPTY_FIRM);
          setSavedFirmInfo(cachedFirm ? JSON.parse(cachedFirm) : EMPTY_FIRM);
          const emptyP = { id: tenantId, firstName: clerkFirstName, lastName: clerkLastName, fullName: `${clerkFirstName} ${clerkLastName}`.trim(), email: clerkEmail, phone: '', whatsApp: '' };
          setProfile(cachedProfile    ? JSON.parse(cachedProfile)    : emptyP);
          setSavedProfile(cachedProfile ? JSON.parse(cachedProfile) : emptyP);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        setError('Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [tenantId, tenantLoading, tenantError]);

  // ── Settings opened tracking ─────────────────────────────────────────────
  useEffect(() => {
    if (tenantId) Events.staffActionTaken({ tenant_id: tenantId, action: 'settings_opened' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // ── Load phone lines + outbound number from localStorage after mount ─────────
  // useState initializers run on the server (SSR) where localStorage is unavailable;
  // React reuses that empty server state on hydration and never re-runs the initializer.
  // A useEffect is the only reliable way to read localStorage on the client.
  useEffect(() => {
    try {
      const storedLines = localStorage.getItem('tv_phone_lines');
      if (storedLines) setPhoneLines(JSON.parse(storedLines));
    } catch {}
    const storedOutbound = localStorage.getItem('tv_outbound_number');
    if (storedOutbound) setOutboundNumber(storedOutbound);
    // Load integration interests
    try {
      const storedIntegrations = localStorage.getItem('tv_integration_interests');
      if (storedIntegrations) setIntegrationInterests(JSON.parse(storedIntegrations));
    } catch {}
  }, []);

  // Reload county list whenever the selected state changes.
  // Falls back to static US_COUNTIES data when SaaS Admin is unreachable.
  useEffect(() => {
    if (!firmInfo?.state) {
      setCounties([]);
      return;
    }
    const toStatic = (state: string) =>
      (US_COUNTIES[state] || []).map(name => ({ id: name.toLowerCase().replace(/\s+/g, '_'), name, isFull: false }));

    setCountiesLoading(true);
    fetch(`/api/reference/counties?state=${firmInfo.state}`)
      .then(r => (r.ok ? r.json() : { counties: [] }))
      .then(data => {
        const api = data.counties || [];
        setCounties(api.length > 0 ? api : toStatic(firmInfo.state));
      })
      .catch(() => setCounties(toStatic(firmInfo.state)))
      .finally(() => setCountiesLoading(false));
  }, [firmInfo?.state]);

  const handleSaveProfile = async () => {
    setSaving('profile');
    try {
      if (tenantId && profile) {
        // Normalize phone numbers to (XXX) XXX-XXXX format before saving
        const normalizedProfile = {
          ...profile,
          phone:    profile.phone    ? formatPhone(profile.phone)    : profile.phone,
          whatsApp: profile.whatsApp ? formatPhone(profile.whatsApp) : profile.whatsApp,
        };
        const profilePayload = JSON.stringify({
          tenantId,
          firstName: normalizedProfile.firstName,
          lastName:  normalizedProfile.lastName,
          phone:     normalizedProfile.phone,
          whatsapp:  normalizedProfile.whatsApp,
        });
        const profileRes = await fetch('/api/settings/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: profilePayload,
        });
        if (!profileRes.ok) {
          // Server unavailable — queue for sync when it comes back
          localStorage.setItem('tv_pending_profile_sync', profilePayload);
        } else {
          localStorage.removeItem('tv_pending_profile_sync');
        }
        setProfile(normalizedProfile);
        setSavedProfile(normalizedProfile);
        setProfileEditing(false);
        // Update local cache so data survives a page refresh
        localStorage.setItem('tv_settings_profile', JSON.stringify(normalizedProfile));
        Events.staffActionTaken({ tenant_id: tenantId, action: 'profile_updated' });
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveFirm = async () => {
    setSaving('firm');
    try {
      if (tenantId && firmInfo) {
        const firmPayload = JSON.stringify({
          tenantId,
          firmName:          firmInfo.name,
          website:           firmInfo.website,
          practiceArea:      firmInfo.practiceArea,
          subSpecialization: firmInfo.subSpecialization,
          firmSize:          firmInfo.firmSize,
          barNumber:         firmInfo.barNumber,
          barState:          firmInfo.barState,
          state:             firmInfo.state,
          zipCode:           firmInfo.zipCode,
          county:            firmInfo.county,
          monthlyCallVolume: firmInfo.monthlyCallVolume,
          address:           firmInfo.address,
          city:              firmInfo.city,
          billingEmail:      firmInfo.billingEmail,
        });
        const firmRes = await fetch('/api/settings/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: firmPayload,
        });
        if (!firmRes.ok) {
          // Server unavailable — queue for sync when it comes back
          localStorage.setItem('tv_pending_firm_sync', firmPayload);
        } else {
          localStorage.removeItem('tv_pending_firm_sync');
        }
        setSavedFirmInfo(firmInfo);
        setFirmEditing(false);
        // Update local cache so data survives a page refresh
        localStorage.setItem('tv_settings_firm', JSON.stringify(firmInfo));
      }
    } catch (err) {
      console.error('Failed to save firm info:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving('notifications');
    try {
      localStorage.setItem('tv_notification_prefs', JSON.stringify(notificationPrefs));
      // TODO: PATCH /api/v1/tenants/:tenantId/notification-prefs
      await new Promise(resolve => setTimeout(resolve, 300));
    } finally {
      setSaving(null);
    }
  };

  const handleSaveCallSettings = async () => {
    setSaving('call');
    try {
      // Persist locally
      localStorage.setItem('tv_call_settings_v2', JSON.stringify(callSettings));
      // TODO: PATCH /api/v1/tenants/:tenantId/call-settings via Tenant App service
      await new Promise(resolve => setTimeout(resolve, 400));
      setCallSettingsSaved(true);
      setTimeout(() => setCallSettingsSaved(false), 3000);
    } finally {
      setSaving(null);
    }
  };

  // ── Phone Lines ────────────────────────────────────────────────────────────
  const [phoneLines, setPhoneLines] = useState<PhoneLine[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PHONE_LINES;
    try {
      const stored = localStorage.getItem('tv_phone_lines');
      return stored ? JSON.parse(stored) : DEFAULT_PHONE_LINES;
    } catch { return DEFAULT_PHONE_LINES; }
  });
  const [phoneLinesSaved, setPhoneLinesSaved] = useState(false);

  const handleSavePhoneLines = async () => {
    setSaving('phone_lines');
    try {
      // Normalize all phone numbers to (XXX) XXX-XXXX format before saving
      const normalized = phoneLines.map(l => ({
        ...l,
        number: l.number ? formatPhone(l.number) : l.number,
      }));
      const normalizedOutbound = outboundNumber ? formatPhone(outboundNumber) : outboundNumber;
      setPhoneLines(normalized);
      setOutboundNumber(normalizedOutbound);
      localStorage.setItem('tv_phone_lines', JSON.stringify(normalized));
      localStorage.setItem('tv_outbound_number', normalizedOutbound);
      // TODO: PATCH /api/v1/tenants/:tenantId/phone-lines
      await new Promise(resolve => setTimeout(resolve, 400));
      setPhoneLinesSaved(true);
      setTimeout(() => setPhoneLinesSaved(false), 3000);
    } finally { setSaving(null); }
  };

  const addPhoneLine = () => {
    const customCount = phoneLines.filter(l => l.id.startsWith('custom_')).length;
    const id = `custom_${Date.now()}`;
    setPhoneLines(prev => [...prev, {
      id,
      label: `Campaign Phone Number 0${customCount + 3}`,
      number: '',
      forwardTo: ''
    }]);
  };

  const removePhoneLine = (id: string) => {
    setPhoneLines(prev => prev.filter(l => l.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Unable to load settings</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your profile, firm information, phone routing, and preferences
        </p>
      </div>

      {/* Sync status banner — shown when pending changes are being pushed after server recovery */}
      {syncStatus === 'syncing' && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          Syncing changes you saved while the server was unavailable...
        </div>
      )}
      {syncStatus === 'synced' && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Your saved changes have been synced to the server.
        </div>
      )}
      {syncStatus === 'failed' && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Could not sync pending changes. They are still saved locally and will retry on next load.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">

        {/* ── 1. Profile ──────────────────────────────────────────────────────── */}
        <div className="bg-card rounded-lg shadow p-6 border border-border md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-card-foreground">Profile</h2>
            </div>
            {!profileEditing && (
              <button
                type="button"
                onClick={() => setProfileEditing(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 dark:border-primary-800 rounded-lg px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>

          {!profileEditing ? (
            /* ── View mode ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">First Name</p>
                <p className="text-sm text-card-foreground">{profile?.firstName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Last Name</p>
                <p className="text-sm text-card-foreground">{profile?.lastName || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Email Address</p>
                <p className="text-sm text-card-foreground">{profile?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Cell Phone Number</p>
                <p className="text-sm text-card-foreground">{profile?.phone ? formatPhone(profile.phone) : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-green-600" /> WhatsApp Number
                </p>
                <p className="text-sm text-card-foreground">{profile?.whatsApp ? formatPhone(profile.whatsApp) : '—'}</p>
              </div>
            </div>
          ) : (
            /* ── Edit mode ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={profile?.firstName || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500 focus:ring-primary-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={profile?.lastName || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Medina"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-muted text-muted-foreground"
                  placeholder="Email not configured"
                />
                <p className="text-xs text-muted-foreground mt-1">Email is managed through your authentication provider.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cell Phone Number</label>
                <input
                  type="tel"
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500 focus:ring-primary-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={profile?.whatsApp || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, whatsApp: e.target.value } : null)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500 focus:ring-primary-500"
                  placeholder="+1 (555) 123-4567"
                />
                <p className="text-xs text-muted-foreground mt-1">Used for urgent lead alerts via WhatsApp.</p>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setProfile(savedProfile); setProfileEditing(false); }}
                  disabled={saving === 'profile'}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-5 py-2 text-sm text-card-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving === 'profile'}
                  className="rounded-lg bg-primary-600 px-5 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === 'profile' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving === 'profile' ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Firm Information ─────────────────────────────────────────────── */}
        <div className="bg-card rounded-lg shadow p-6 border border-border md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-card-foreground">Firm Information</h2>
            </div>
            {!firmEditing && (
              <button
                type="button"
                onClick={() => setFirmEditing(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 dark:border-primary-800 rounded-lg px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>

          {!firmEditing ? (
            /* ── View mode ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Law Firm Name</p>
                <p className="text-sm text-card-foreground">{firmInfo?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Website</p>
                <p className="text-sm text-card-foreground">{firmInfo?.website || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Practice Area</p>
                <p className="text-sm text-card-foreground">{firmInfo?.practiceArea || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Sub-Specializations</p>
                <p className="text-sm text-card-foreground">{firmInfo?.subSpecialization?.length ? firmInfo.subSpecialization.join(', ') : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Firm Size</p>
                <p className="text-sm text-card-foreground">{firmInfo?.firmSize || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Monthly Inbound Calls</p>
                <p className="text-sm text-card-foreground">{firmInfo?.monthlyCallVolume || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Bar License Number</p>
                <p className="text-sm text-card-foreground">{firmInfo?.barNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Bar Jurisdiction</p>
                <p className="text-sm text-card-foreground">{firmInfo?.barState || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">State</p>
                <p className="text-sm text-card-foreground">{firmInfo?.state || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">ZIP Code</p>
                <p className="text-sm text-card-foreground">{firmInfo?.zipCode || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Primary County</p>
                <p className="text-sm text-card-foreground">{firmInfo?.county || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Street Address</p>
                <p className="text-sm text-card-foreground">{firmInfo?.address || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">City</p>
                <p className="text-sm text-card-foreground">{firmInfo?.city || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Billing / Invoice Email</p>
                <p className="text-sm text-card-foreground">{firmInfo?.billingEmail || clerkEmail || '—'}</p>
                {!firmInfo?.billingEmail && clerkEmail && (
                  <p className="text-xs text-muted-foreground mt-0.5">Using your login email as default.</p>
                )}
              </div>
            </div>
          ) : (
            /* ── Edit mode ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Row 1 — Name + Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Law Firm Name</label>
              <input
                type="text"
                value={firmInfo?.name || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                placeholder="Oakwood Law Firm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Law Firm Website</label>
              <input
                type="text"
                value={firmInfo?.website || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), website: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                placeholder="https://oakwoodlaw.com"
              />
            </div>

            {/* Row 2 — Practice Area + Sub-Specialization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Practice Area</label>
              <select
                value={firmInfo?.practiceArea || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), practiceArea: e.target.value, subSpecialization: [] }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
              >
                <option value="">Select practice area...</option>
                <option value="personal_injury">Personal Injury</option>
                <option value="medical_malpractice">Medical Malpractice</option>
                <option value="employment">Employment Law</option>
                <option value="family">Family Law</option>
                <option value="criminal">Criminal Defense</option>
                <option value="immigration">Immigration</option>
                <option value="real_estate">Real Estate</option>
                <option value="business">Business / Commercial</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sub-Specializations</label>
              <div className="relative">
                {/* Trigger button */}
                <button
                  type="button"
                  disabled={!firmInfo?.practiceArea}
                  onClick={() => setSubSpecOpen(o => !o)}
                  className="w-full flex items-center justify-between rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:outline-none focus:border-primary-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className={firmInfo?.subSpecialization?.length ? 'text-card-foreground' : 'text-muted-foreground'}>
                    {!firmInfo?.practiceArea
                      ? 'Select practice area first'
                      : firmInfo.subSpecialization?.length
                        ? `${firmInfo.subSpecialization.length} selected`
                        : 'Select sub-specializations...'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${subSpecOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown panel */}
                {subSpecOpen && firmInfo?.practiceArea && (
                  <>
                    {/* Backdrop — click outside to close */}
                    <div className="fixed inset-0 z-10" onClick={() => setSubSpecOpen(false)} />
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                      <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {(SUB_SPECIALIZATIONS[firmInfo.practiceArea] ?? []).map(opt => {
                          const checked = (firmInfo.subSpecialization ?? []).includes(opt.value);
                          return (
                            <label
                              key={opt.value}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setFirmInfo(prev => {
                                    const current = (prev ?? EMPTY_FIRM).subSpecialization ?? [];
                                    const next = checked
                                      ? current.filter(v => v !== opt.value)
                                      : [...current, opt.value];
                                    return { ...(prev ?? EMPTY_FIRM), subSpecialization: next };
                                  });
                                }}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-card-foreground">{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {/* Done button */}
                      <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), subSpecialization: [] }))}
                          className="text-xs text-muted-foreground hover:text-red-500 transition-colors px-2 py-1 rounded"
                        >
                          Clear all
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubSpecOpen(false)}
                          className="rounded-md bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
                        >
                          Done{firmInfo.subSpecialization?.length ? ` (${firmInfo.subSpecialization.length})` : ''}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Select all that apply — for team assignment &amp; call routing.</p>
            </div>

            {/* Row 3 — Firm Size + Monthly Call Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Firm Size</label>
              <select
                value={firmInfo?.firmSize || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), firmSize: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
              >
                <option value="">Select firm size...</option>
                <option value="solo">Solo Law Firm (1 Attorney)</option>
                <option value="2-3">2–3 Attorney Law Firm</option>
                <option value="4-11">4–11 Attorney Law Firm</option>
                <option value="up-to-21">Up to 21 Attorneys</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">TrueVow is purpose-built for small law firms (up to 21 attorneys).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monthly Inbound Calls (estimate)</label>
              <select
                value={firmInfo?.monthlyCallVolume || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), monthlyCallVolume: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
              >
                <option value="">Select volume...</option>
                <option value="under-50">Under 50 calls/month</option>
                <option value="50-100">50–100 calls/month</option>
                <option value="100-250">100–250 calls/month</option>
                <option value="250-500">250–500 calls/month</option>
                <option value="500+">500+ calls/month</option>
              </select>
            </div>

            {/* Row 4 — State Bar License + Bar Jurisdiction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State Bar License Number</label>
              <input
                type="text"
                value={firmInfo?.barNumber || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), barNumber: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                placeholder="e.g. FL Bar #123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bar Jurisdiction (State)</label>
              <select
                value={firmInfo?.barState || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), barState: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
              >
                <option value="">Select state...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Row 5 — State + ZIP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Firm State</label>
              <select
                value={firmInfo?.state || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), state: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
              >
                <option value="">Select state...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ZIP Code</label>
              <input
                type="text"
                value={firmInfo?.zipCode || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), zipCode: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                placeholder="12345"
                maxLength={10}
              />
            </div>

            {/* Row 6 — County + Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary County</label>
              <select
                value={firmInfo?.county || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), county: e.target.value }))}
                disabled={!firmInfo?.state || countiesLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500 text-sm font-medium disabled:opacity-50"
              >
                <option value="">
                  {!firmInfo?.state ? 'Select state first' : countiesLoading ? 'Loading counties…' : 'Select county…'}
                </option>
                {counties.map(c => (
                  <option key={c.id} value={c.name} disabled={c.isFull}>
                    {c.name}{c.isFull ? ' (Full)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Street Address</label>
              <input
                type="text"
                value={firmInfo?.address || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), address: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                placeholder="123 Main Street, Suite 100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
              <input
                type="text"
                value={firmInfo?.city || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), city: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                placeholder="Miami"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing / Invoice Email</label>
              <input
                type="email"
                value={firmInfo?.billingEmail || ''}
                onChange={(e) => setFirmInfo(prev => ({ ...(prev ?? EMPTY_FIRM), billingEmail: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                placeholder={clerkEmail || 'billing@lawfirm.com'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Where TrueVow sends invoices and billing notices. Leave blank to use your login email.
                For multi-attorney firms, this is typically the firm’s shared email or bookkeeper.
              </p>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setFirmInfo(savedFirmInfo); setFirmEditing(false); }}
                  disabled={saving === 'firm'}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-5 py-2 text-sm text-card-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFirm}
                  disabled={saving === 'firm'}
                  className="rounded-lg bg-primary-600 px-5 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === 'firm' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving === 'firm' ? 'Saving...' : 'Save Firm Information'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Phone Line Routing ───────────────────────────────────────────── */}
        <div className="bg-card rounded-lg shadow p-6 border border-border md:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <PhoneForwarded className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Phone Line Routing</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Enter each of your firm&apos;s phone numbers below and assign them to a TrueVow Benjamin agent line.
            Calls forwarded to those TrueVow numbers will be handled by the assigned agent.
          </p>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[1fr_180px_180px_40px] gap-3 mb-2 px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Label</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Firm Number</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Forward to TrueVow Agent</span>
            <span />
          </div>

          <div className="space-y-3">
            {phoneLines.map((line, idx) => {
              const isRemovable = line.id.startsWith('custom_');
              return (
                <div key={line.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_40px] gap-3 items-center">
                  {/* Label */}
                  <div>
                    <input
                      type="text"
                      value={line.label}
                      onChange={(e) => setPhoneLines(prev => prev.map((l, i) => i === idx ? { ...l, label: e.target.value } : l))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                      placeholder="Line label"
                    />
                  </div>
                  {/* Firm number */}
                  <div>
                    <input
                      type="tel"
                      value={line.number}
                      onChange={(e) => setPhoneLines(prev => prev.map((l, i) => i === idx ? { ...l, number: e.target.value } : l))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                  {/* Forward-to TrueVow line */}
                  <div>
                    <select
                      value={line.forwardTo}
                      onChange={(e) => setPhoneLines(prev => prev.map((l, i) => i === idx ? { ...l, forwardTo: e.target.value } : l))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500"
                    >
                      <option value="">— No routing —</option>
                      {TRUEVOW_LINES.map(tl => (
                        <option key={tl.id} value={tl.id}>{tl.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Remove (custom lines only) */}
                  <div className="flex justify-center">
                    {isRemovable ? (
                      <button
                        type="button"
                        onClick={() => removePhoneLine(line.id)}
                        className="rounded-full p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove line"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="w-7" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add line button */}
          <button
            type="button"
            onClick={addPhoneLine}
            className="mt-4 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="h-4 w-4" /> Add another phone line
          </button>

          {/* Outbound Caller ID */}
          <div className="mt-5 p-4 rounded-lg border border-border bg-muted/30">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-primary-600" /> Outbound Caller ID
              </span>
            </label>
            <input
              type="tel"
              value={outboundNumber}
              onChange={(e) => setOutboundNumber(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-card-foreground focus:border-primary-500 text-sm"
              placeholder="(555) 000-0000"
            />
            <p className="text-xs text-muted-foreground mt-1">The caller ID shown on outbound calls made by Benjamin on your behalf.</p>
          </div>

          {/* TrueVow lines reference */}
          <div className="mt-6 rounded-lg bg-muted px-4 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">TrueVow Benjamin Agent Lines</p>
            <ul className="space-y-1">
              {TRUEVOW_LINES.map(tl => (
                <li key={tl.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <PhoneForwarded className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{tl.label}</span>
                  <span className="text-muted-foreground/60">— number provided after onboarding</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              Need additional agent lines or custom routing? Contact your account manager — lines are configured during onboarding.
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSavePhoneLines}
              disabled={saving === 'phone_lines'}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving === 'phone_lines' && <Loader2 className="h-4 w-4 animate-spin" />}
              {phoneLinesSaved ? (
                <><span className="text-green-200">✓</span> Saved</>
              ) : saving === 'phone_lines' ? 'Saving...' : 'Save Phone Line Routing'}
            </button>
          </div>
        </div>

        {/* ── 4. Call Recording & Transcription ──────────────────────────────── */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Call Recording & Transcription</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Configure how Benjamin handles intake call data. Both options are <strong>off by default</strong>.
            Changes apply to new calls only — existing records are unaffected.
          </p>
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-card-foreground">Call Recording</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Record intake calls for attorney review. Callers are notified at the start of the call.
                </p>
              </div>
              <Toggle
                checked={callSettings.recording_enabled}
                onChange={(v) => setCallSettings(prev => ({ ...prev, recording_enabled: v }))}
                disabled={saving === 'call'}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-card-foreground">Auto-Transcription</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate a text transcript of each intake call. Visible on the lead detail page.
                </p>
                {callSettings.transcription_enabled && !callSettings.recording_enabled && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Note: Transcription requires call recording to be enabled.
                  </p>
                )}
              </div>
              <Toggle
                checked={callSettings.transcription_enabled}
                onChange={(v) => setCallSettings(prev => ({ ...prev, transcription_enabled: v }))}
                disabled={saving === 'call'}
              />
            </div>
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={handleSaveCallSettings}
                disabled={saving === 'call'}
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving === 'call' && <Loader2 className="h-4 w-4 animate-spin" />}
                {callSettingsSaved ? (
                  <><span className="text-green-200">✓</span> Saved</>
                ) : saving === 'call' ? 'Saving...' : 'Save Call Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 5. Notifications ────────────────────────────────────────────────── */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Alert Preferences</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Choose when TrueVow should notify you about lead activity.
          </p>
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-card-foreground">New lead received</span>
                <p className="text-xs text-muted-foreground mt-0.5">Notify me immediately when a new intake lead comes in.</p>
              </div>
              <Toggle
                checked={notificationPrefs.newLead}
                onChange={(v) => setNotificationPrefs(prev => ({ ...prev, newLead: v }))}
                disabled={saving === 'notifications'}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-card-foreground">High-priority lead alert</span>
                <p className="text-xs text-muted-foreground mt-0.5">Notify me when a lead is scored as <strong>Call Now</strong> priority.</p>
              </div>
              <Toggle
                checked={notificationPrefs.highPriorityLead}
                onChange={(v) => setNotificationPrefs(prev => ({ ...prev, highPriorityLead: v }))}
                disabled={saving === 'notifications'}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-card-foreground">Response time warning</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Alert me if a lead waits more than{' '}
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={notificationPrefs.responseWarningMinutes}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, responseWarningMinutes: Math.max(1, parseInt(e.target.value) || 1) }))}
                    disabled={!notificationPrefs.responseWarning || saving === 'notifications'}
                    className="mx-1 w-12 rounded border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-xs bg-white dark:bg-gray-800 text-card-foreground text-center disabled:opacity-50 inline"
                  />{' '}minutes without a response.
                  {!notificationPrefs.responseWarning && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400">Disabled — no response-time alerts will be sent.</span>
                  )}
                </p>
              </div>
              <Toggle
                checked={notificationPrefs.responseWarning}
                onChange={(v) => setNotificationPrefs(prev => ({ ...prev, responseWarning: v }))}
                disabled={saving === 'notifications'}
              />
            </div>
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={handleSaveNotifications}
                disabled={saving === 'notifications'}
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving === 'notifications' && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving === 'notifications' ? 'Saving...' : 'Save Alert Preferences'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 6. API Access ────────────────────────────────────────────────────── */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <Key className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-card-foreground">API Access</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Use API keys to connect your own internal tools to TrueVow — push lead data to your case management system, receive webhooks, or trigger intake flows. Third-party integrations (Clio, email, calendar) are set up by your account manager during onboarding.
          </p>
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-card-foreground">
            <p className="font-medium mb-1">Is this for me?</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              <strong>Probably not</strong> — most law firms never need this. API keys are for your IT person or a developer
              who wants to build a direct connection between TrueVow and another software system your firm uses.
              <br /><br />
              <strong>Just want to export your leads?</strong> Go to the <strong>Leads</strong> page and click the
              <strong> Export</strong> button — it downloads a spreadsheet you can open directly in Excel or Google Sheets.
              No developer needed.
            </p>
          </div>
          <div className="rounded-lg bg-muted px-4 py-3 flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">API key management is coming in a future release.</span>
          </div>

          {/* Optional integrations interest selector */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setIntegrationsOpen(v => !v)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${integrationsOpen ? 'rotate-180' : ''}`} />
              Optional Integrations{integrationInterests.length > 0 ? ` (${integrationInterests.length} selected)` : ''}
            </button>

            {integrationsOpen && (
              <div className="mt-3 rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium text-card-foreground mb-1">Select which systems you'd like to connect</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  These are set up by your account manager during onboarding — no technical work required on your end.
                  Selecting here registers your interest so your CS manager can prepare the connection in advance.
                </p>
                <div className="space-y-2">
                  {INTEGRATION_OPTIONS.map(opt => {
                    const checked = integrationInterests.includes(opt.id);
                    return (
                      <label key={opt.id} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? integrationInterests.filter(id => id !== opt.id)
                              : [...integrationInterests, opt.id];
                            setIntegrationInterests(next);
                            localStorage.setItem('tv_integration_interests', JSON.stringify(next));
                          }}
                          className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>
                          <span className="text-sm font-medium text-card-foreground">{opt.label}</span>
                          <span className="block text-xs text-muted-foreground">{opt.desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIntegrationInterests([]);
                      localStorage.setItem('tv_integration_interests', JSON.stringify([]));
                    }}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors px-2 py-1 rounded"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrationsOpen(false)}
                    className="rounded-md bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                  >
                    Done{integrationInterests.length > 0 ? ` (${integrationInterests.length})` : ''}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 7. Team ──────────────────────────────────────────────────────────── */}

        {/* ── 8. Security (bottom) ─────────────────────────────────────────────── */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Security</h2>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Password changes and account security are managed through your TrueVow account portal.
              Two-factor authentication and active session management are also available there.
            </p>
            <button
              type="button"
              onClick={() => openUserProfile()}
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-muted transition-colors"
            >
              Manage Account <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}