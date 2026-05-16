'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Mail, Briefcase, Calendar, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { Events } from '@/lib/analytics/events';

export default function InviteTeamMemberPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    practiceArea: string[];
    calendarType: string;
    services: string[];
  }>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'attorney',
    practiceArea: [],
    calendarType: 'google',
    services: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const practiceAreas = [
    'Personal Injury',
    'Family Law',
    'Immigration',
    'Criminal Defense',
    'Employment Law',
    'Bankruptcy',
    'Real Estate',
    'Estate Planning',
    'Workers\' Compensation',
    'Business Law'
  ];

  const services = [
    { id: 'intake', name: 'INTAKE' },
    { id: 'draft', name: 'LEVERAGE' },
    { id: 'settle', name: 'SETTLE' },
    { id: 'verify', name: 'VERIFY' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePracticeAreaToggle = (area: string) => {
    setFormData(prev => {
      const current = prev.practiceArea || [];
      const updated = current.includes(area)
        ? current.filter(a => a !== area)
        : [...current, area];
      return { ...prev, practiceArea: updated };
    });
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => {
      const current = prev.services || [];
      const updated = current.includes(serviceId)
        ? current.filter(s => s !== serviceId)
        : [...current, serviceId];
      return { ...prev, services: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          role: formData.role,
          services: formData.services,
          practiceAreas: formData.practiceArea,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }
      
      console.log('Invited team member:', data);
      Events.staffInvited({ invitee_email: formData.email });
      setSuccess(true);
      
      // Redirect to team page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/team');
      }, 2000);
      
    } catch (err: any) {
      console.error('Failed to invite team member:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/team" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4">
          <ArrowLeft size={20} />
          Back to Team Management
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Invite Team Member</h1>
        <p className="mt-2 text-gray-600">
          Add attorneys, paralegals, or staff members to your team
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Invitation sent successfully!</p>
              <p className="text-sm text-green-700">Redirecting to team management...</p>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                placeholder="Enter first name"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500"
              placeholder="Enter last name"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500"
              placeholder="email@lawfirm.com"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500 appearance-none"
              >
                <option value="attorney">Attorney</option>
                <option value="paralegal">Paralegal</option>
                <option value="admin">Administrative Staff</option>
                <option value="receptionist">Receptionist</option>
                <option value="manager">Office Manager</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calendar Integration
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                value={formData.calendarType}
                onChange={(e) => handleInputChange('calendarType', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500 appearance-none"
              >
                <option value="google">Google Calendar</option>
                <option value="outlook">Outlook Calendar</option>
                <option value="clio">Clio Calendar</option>
                <option value="truevow">TrueVow Calendar</option>
                <option value="none">No Calendar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Practice Areas */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Practice Areas
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {practiceAreas.map((area) => (
              <label key={area} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(formData.practiceArea || []).includes(area)}
                  onChange={() => handlePracticeAreaToggle(area)}
                  className="rounded text-primary-600"
                />
                <span className="text-sm text-gray-700">{area}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Service Access */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Service Access Permissions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((service) => (
              <label key={service.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.services.includes(service.id)}
                  onChange={() => handleServiceToggle(service.id)}
                  className="rounded text-primary-600"
                />
                <ShieldCheck className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{service.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard/team"
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending Invite...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Once invited, team members will receive an email with instructions to set up their accounts. 
          They'll need to connect their calendar and configure their practice areas and availability in the Calendar Configuration page.
        </p>
      </div>
    </div>
  );
}