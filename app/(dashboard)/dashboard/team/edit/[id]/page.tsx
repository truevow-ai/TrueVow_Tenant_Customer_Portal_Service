'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Mail, Briefcase, Calendar, ShieldCheck, Save } from 'lucide-react';

export default function EditTeamMemberPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'attorney',
    practiceArea: [] as string[],
    calendarType: 'google',
    services: [] as string[],
    status: 'active',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    // Simulate loading team member data
    setTimeout(() => {
      setFormData({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@lawfirm.com',
        role: 'attorney',
        practiceArea: ['Personal Injury', 'Workers\' Compensation'],
        calendarType: 'google',
        services: ['intake', 'draft', 'settle'],
        status: 'active',
      });
      setLoading(false);
    }, 500);
  }, [memberId]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Updating team member:', { id: memberId, ...formData });
    setSaving(false);
    alert(`Team member ${formData.firstName} ${formData.lastName} updated successfully!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/team" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4">
          <ArrowLeft size={20} />
          Back to Team Management
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Team Member</h1>
        <p className="mt-2 text-gray-600">
          Update profile, calendar, and permissions for {formData.firstName} {formData.lastName}
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on-leave">On Leave</option>
            </select>
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
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}