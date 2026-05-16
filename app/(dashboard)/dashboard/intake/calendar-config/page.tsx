'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Users, Clock, Settings, Plus, Trash2, Save } from 'lucide-react';

export default function CalendarConfigPage() {
  const [attorneys, setAttorneys] = useState<any[]>([]);
  const [practiceAreas] = useState([
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
  ]);

  const [bookingRules, setBookingRules] = useState({
    defaultRoutingMethod: 'practice-area', // 'practice-area', 'round-robin', 'last-in-first-out'
    practiceAreaAssignments: {} as Record<string, string[]>, // practiceArea -> attorneyIds[]
    timeSlotPreferences: {} as Record<string, { morning: boolean; afternoon: boolean; evening: boolean }>, // attorneyId -> slots
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Mock attorneys - Replace with actual API call
    setAttorneys([
      { id: 'atty-1', name: 'John Smith', email: 'john@lawfirm.com', calendar: 'Google Calendar' },
      { id: 'atty-2', name: 'Sarah Johnson', email: 'sarah@lawfirm.com', calendar: 'Clio' },
      { id: 'atty-3', name: 'Michael Brown', email: 'michael@lawfirm.com', calendar: 'Not Connected' },
    ]);

    // Mock existing rules
    setBookingRules({
      defaultRoutingMethod: 'practice-area',
      practiceAreaAssignments: {
        'Personal Injury': ['atty-1', 'atty-2'],
        'Family Law': ['atty-2'],
        'Criminal Defense': ['atty-1'],
      },
      timeSlotPreferences: {
        'atty-1': { morning: true, afternoon: true, evening: false },
        'atty-2': { morning: true, afternoon: false, evening: true },
        'atty-3': { morning: false, afternoon: true, evening: false },
      },
    });
  }, []);

  const handleRoutingMethodChange = (method: string) => {
    setBookingRules({ ...bookingRules, defaultRoutingMethod: method });
  };

  const handlePracticeAreaAssignment = (practiceArea: string, attorneyId: string, checked: boolean) => {
    const current = bookingRules.practiceAreaAssignments[practiceArea] || [];
    const updated = checked 
      ? [...current, attorneyId]
      : current.filter(id => id !== attorneyId);
    
    setBookingRules({
      ...bookingRules,
      practiceAreaAssignments: {
        ...bookingRules.practiceAreaAssignments,
        [practiceArea]: updated
      }
    });
  };

  const handleTimeSlotChange = (attorneyId: string, slot: 'morning' | 'afternoon' | 'evening', checked: boolean) => {
    const current = bookingRules.timeSlotPreferences[attorneyId] || { morning: false, afternoon: false, evening: false };
    setBookingRules({
      ...bookingRules,
      timeSlotPreferences: {
        ...bookingRules.timeSlotPreferences,
        [attorneyId]: { ...current, [slot]: checked }
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Saving booking rules:', bookingRules);
    setSaving(false);
    alert('Calendar configuration saved successfully!');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/intake" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4">
          <ArrowLeft size={20} />
          Back to INTAKE Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Calendar Configuration</h1>
        <p className="mt-2 text-gray-600">
          Configure how Benjamin books consultations based on practice areas, attorneys, and time preferences
        </p>
      </div>

      {/* Routing Method Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Booking Routing Method</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Choose how Benjamin assigns consultations when multiple attorneys are available
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            bookingRules.defaultRoutingMethod === 'practice-area' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="routing"
              value="practice-area"
              checked={bookingRules.defaultRoutingMethod === 'practice-area'}
              onChange={(e) => handleRoutingMethodChange(e.target.value)}
              className="text-primary-600"
            />
            <div>
              <p className="font-semibold text-gray-900">Practice Area</p>
              <p className="text-xs text-gray-600">Route by attorney specialization</p>
            </div>
          </label>
          <label className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            bookingRules.defaultRoutingMethod === 'round-robin' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="routing"
              value="round-robin"
              checked={bookingRules.defaultRoutingMethod === 'round-robin'}
              onChange={(e) => handleRoutingMethodChange(e.target.value)}
              className="text-primary-600"
            />
            <div>
              <p className="font-semibold text-gray-900">Round Robin</p>
              <p className="text-xs text-gray-600">Distribute evenly across attorneys</p>
            </div>
          </label>
          <label className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            bookingRules.defaultRoutingMethod === 'last-in-first-out' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="routing"
              value="last-in-first-out"
              checked={bookingRules.defaultRoutingMethod === 'last-in-first-out'}
              onChange={(e) => handleRoutingMethodChange(e.target.value)}
              className="text-primary-600"
            />
            <div>
              <p className="font-semibold text-gray-900">Last In First Out</p>
              <p className="text-xs text-gray-600">Most recent gets next booking</p>
            </div>
          </label>
        </div>
      </div>

      {/* Practice Area Assignments */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Practice Area Assignments</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Assign attorneys to practice areas. Multiple attorneys can handle the same practice area.
        </p>
        {attorneys.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No attorneys found</p>
            <Link href="/dashboard/team/invite" className="text-primary-600 hover:underline text-sm">
              + Invite Team Member
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {practiceAreas.map((practiceArea) => (
              <div key={practiceArea} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{practiceArea}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attorneys.map((attorney) => (
                    <label key={attorney.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(bookingRules.practiceAreaAssignments[practiceArea] || []).includes(attorney.id)}
                        onChange={(e) => handlePracticeAreaAssignment(practiceArea, attorney.id, e.target.checked)}
                        className="rounded text-primary-600"
                      />
                      <span className="text-sm text-gray-700">{attorney.name}</span>
                      {attorney.calendar === 'Not Connected' && (
                        <span className="text-xs text-red-600">(No Calendar)</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time Slot Preferences */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Time Slot Preferences</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Set preferred consultation times for each attorney (Morning: 8am-12pm, Afternoon: 12pm-5pm, Evening: 5pm-8pm)
        </p>
        <div className="space-y-4">
          {attorneys.map((attorney) => (
            <div key={attorney.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{attorney.name}</h3>
                {attorney.calendar === 'Not Connected' && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Calendar Not Connected</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingRules.timeSlotPreferences[attorney.id]?.morning || false}
                    onChange={(e) => handleTimeSlotChange(attorney.id, 'morning', e.target.checked)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm text-gray-700">Morning (8am-12pm)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingRules.timeSlotPreferences[attorney.id]?.afternoon || false}
                    onChange={(e) => handleTimeSlotChange(attorney.id, 'afternoon', e.target.checked)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm text-gray-700">Afternoon (12pm-5pm)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingRules.timeSlotPreferences[attorney.id]?.evening || false}
                    onChange={(e) => handleTimeSlotChange(attorney.id, 'evening', e.target.checked)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm text-gray-700">Evening (5pm-8pm)</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Link
          href="/dashboard/intake"
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Attorneys must have their calendars connected in the{' '}
          <Link href="/dashboard/team" className="underline font-semibold">Team Management</Link> page before they can receive bookings.
          Benjamin will only book consultations with attorneys who have available time slots in their connected calendars.
        </p>
      </div>
    </div>
  );
}
