'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  PhoneIncoming, 
  UserCheck, 
  FileText, 
  Calendar, 
  Phone, 
  Mail, 
  Clock,
  XCircle,
  CheckCircle,
  FileSignature,
  Filter,
  Download,
  Play,
  Pause,
  Cloud,
  ExternalLink,
  CheckSquare,
  Square,
  X,
  Volume2
} from 'lucide-react';
import { useCompanyToast } from '@/hooks/useCompanyToast';

interface CallRecord {
  id: string;
  date: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  callDuration: number;
  qualified: boolean;
  intakeStatus: 'completed' | 'not_qualified' | 'pending' | 'skipped';
  bookingStatus?: 'consultation_booked' | 'engagement_letter' | 'none';
  consultationDate?: string;
  inboundNumber: string;
  intakeLanguage: 'english' | 'spanish';
  practiceArea: string;
  hasTranscript: boolean;
}

const PRACTICE_AREAS = [
  'Car Accident',
  'Slip and Fall',
  'Workplace Injury',
  'Dog Bite',
  'Product Defect',
  'Medical Malpractice',
  'Nursing Home Abuse',
  'Wrongful Death',
  'Other'
];

const INBOUND_NUMBERS = [
  { number: '+1 (555) 100-0001', label: 'Main Line' },
  { number: '+1 (555) 100-0002', label: 'Spanish Line' },
  { number: '+1 (555) 100-0003', label: 'After Hours' }
];

export default function UsagePage() {
  const toast = useCompanyToast();
  const [selectedInboundNumber, setSelectedInboundNumber] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedPracticeArea, setSelectedPracticeArea] = useState<string>('all');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<CallRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  const callRecords: CallRecord[] = [
    {
      id: '1', date: '2026-02-17', clientName: 'John Smith', clientPhone: '+1 (555) 123-4567',
      clientEmail: 'john.smith@email.com', callDuration: 8, qualified: true,
      intakeStatus: 'completed', bookingStatus: 'consultation_booked', consultationDate: '2026-02-20',
      inboundNumber: '+1 (555) 100-0001', intakeLanguage: 'english', practiceArea: 'Car Accident', hasTranscript: true
    },
    {
      id: '2', date: '2026-02-16', clientName: 'Sarah Johnson', clientPhone: '+1 (555) 234-5678',
      clientEmail: 'sarah.j@email.com', callDuration: 12, qualified: true,
      intakeStatus: 'completed', bookingStatus: 'consultation_booked', consultationDate: '2026-02-19',
      inboundNumber: '+1 (555) 100-0002', intakeLanguage: 'spanish', practiceArea: 'Slip and Fall', hasTranscript: true
    },
    {
      id: '3', date: '2026-02-15', clientName: 'Michael Brown', clientPhone: '+1 (555) 345-6789',
      clientEmail: 'mbrown@email.com', callDuration: 6, qualified: true,
      intakeStatus: 'completed', bookingStatus: 'engagement_letter',
      inboundNumber: '+1 (555) 100-0001', intakeLanguage: 'english', practiceArea: 'Workplace Injury', hasTranscript: true
    },
    {
      id: '4', date: '2026-02-14', clientName: 'Emily Davis', clientPhone: '+1 (555) 456-7890',
      clientEmail: 'emily.d@email.com', callDuration: 15, qualified: true,
      intakeStatus: 'completed', bookingStatus: 'consultation_booked', consultationDate: '2026-02-18',
      inboundNumber: '+1 (555) 100-0001', intakeLanguage: 'english', practiceArea: 'Dog Bite', hasTranscript: true
    },
    {
      id: '5', date: '2026-02-13', clientName: 'Robert Wilson', clientPhone: '+1 (555) 567-8901',
      clientEmail: 'rwilson@email.com', callDuration: 10, qualified: true,
      intakeStatus: 'completed', bookingStatus: 'consultation_booked', consultationDate: '2026-02-17',
      inboundNumber: '+1 (555) 100-0003', intakeLanguage: 'english', practiceArea: 'Product Defect', hasTranscript: true
    },
    {
      id: '6', date: '2026-02-12', clientName: 'Jennifer Lee', clientPhone: '+1 (555) 678-9012',
      clientEmail: 'jlee@email.com', callDuration: 4, qualified: false,
      intakeStatus: 'not_qualified', bookingStatus: 'none',
      inboundNumber: '+1 (555) 100-0001', intakeLanguage: 'english', practiceArea: 'Other', hasTranscript: false
    },
    {
      id: '7', date: '2026-02-11', clientName: 'David Martinez', clientPhone: '+1 (555) 789-0123',
      clientEmail: 'dmartinez@email.com', callDuration: 9, qualified: true,
      intakeStatus: 'completed', bookingStatus: 'engagement_letter',
      inboundNumber: '+1 (555) 100-0002', intakeLanguage: 'spanish', practiceArea: 'Car Accident', hasTranscript: true
    },
    {
      id: '8', date: '2026-02-10', clientName: 'Amanda Taylor', clientPhone: '+1 (555) 890-1234',
      clientEmail: 'ataylor@email.com', callDuration: 7, qualified: true,
      intakeStatus: 'completed', bookingStatus: 'consultation_booked', consultationDate: '2026-02-15',
      inboundNumber: '+1 (555) 100-0001', intakeLanguage: 'english', practiceArea: 'Medical Malpractice', hasTranscript: true
    },
    {
      id: '9', date: '2026-02-09', clientName: 'James Anderson', clientPhone: '+1 (555) 901-2345',
      clientEmail: 'janderson@email.com', callDuration: 3, qualified: false,
      intakeStatus: 'not_qualified', bookingStatus: 'none',
      inboundNumber: '+1 (555) 100-0003', intakeLanguage: 'english', practiceArea: 'Other', hasTranscript: false
    },
    {
      id: '10', date: '2026-02-08', clientName: 'Lisa Garcia', clientPhone: '+1 (555) 012-3456',
      clientEmail: 'lgarcia@email.com', callDuration: 11, qualified: true,
      intakeStatus: 'completed', bookingStatus: 'consultation_booked', consultationDate: '2026-02-12',
      inboundNumber: '+1 (555) 100-0002', intakeLanguage: 'spanish', practiceArea: 'Nursing Home Abuse', hasTranscript: true
    }
  ];

  const filteredRecords = callRecords.filter(record => {
    // Filter by inbound number
    if (selectedInboundNumber !== 'all' && record.inboundNumber !== selectedInboundNumber) return false;
    
    // Filter by language
    if (selectedLanguage !== 'all' && record.intakeLanguage !== selectedLanguage) return false;
    
    // Filter by practice area
    if (selectedPracticeArea !== 'all' && record.practiceArea !== selectedPracticeArea) return false;
    
    // Filter by date range
    if (startDate && record.date < startDate) return false;
    if (endDate && record.date > endDate) return false;
    
    // Filter by keyword search
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const matchesName = record.clientName.toLowerCase().includes(keyword);
      const matchesPhone = record.clientPhone.toLowerCase().includes(keyword);
      const matchesEmail = record.clientEmail?.toLowerCase().includes(keyword);
      const matchesPracticeArea = record.practiceArea.toLowerCase().includes(keyword);
      
      if (!matchesName && !matchesPhone && !matchesEmail && !matchesPracticeArea) return false;
    }
    
    return true;
  });

  const totalCalls = filteredRecords.length;
  const qualifiedCalls = filteredRecords.filter(r => r.qualified).length;
  const completedIntakes = filteredRecords.filter(r => r.intakeStatus === 'completed').length;
  const consultationBooked = filteredRecords.filter(r => r.bookingStatus === 'consultation_booked').length;
  const engagementLetterRequested = filteredRecords.filter(r => r.bookingStatus === 'engagement_letter').length;
  const totalBookings = consultationBooked + engagementLetterRequested;
  const freeBookingsRemaining = 12 - totalBookings;
  const totalTalkTime = filteredRecords.reduce((acc, r) => acc + r.callDuration, 0);

  const toggleRecordSelection = (id: string) => {
    setSelectedRecords(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAllRecords = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(r => r.id));
    }
  };

  const openTranscript = (record: CallRecord) => {
    setSelectedTranscript(record);
    setShowTranscriptModal(true);
  };

  const exportToCloud = (destination: 'google-drive' | 'onedrive', recordIds?: string[]) => {
    const ids = recordIds || selectedRecords;
    if (ids.length === 0) {
      toast.error('No Selection', 'Please select records to export');
      return;
    }
    toast.success('Export Started', `Exporting ${ids.length} transcript(s) to ${destination === 'google-drive' ? 'Google Drive' : 'OneDrive'}...`);
  };

  const downloadTranscript = (record: CallRecord) => {
    toast.success('Download Started', `Downloading transcript for ${record.clientName}...`);
  };

  const openDetails = (record: CallRecord) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4">
          <ArrowLeft size={20} /> Back to Billing
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Usage Analytics</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Detailed breakdown of calls, intakes, and bookings</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-4 mb-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-muted-foreground" />
          <span className="font-medium text-card-foreground">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Phone Number Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Inbound Number</label>
            <select
              value={selectedInboundNumber}
              onChange={(e) => setSelectedInboundNumber(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Numbers</option>
              {INBOUND_NUMBERS.map(num => (
                <option key={num.number} value={num.number}>{num.label} ({num.number})</option>
              ))}
            </select>
          </div>
          
          {/* Language Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Intake Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Languages</option>
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
            </select>
          </div>
          
          {/* Practice Area Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Practice Area</label>
            <select
              value={selectedPracticeArea}
              onChange={(e) => setSelectedPracticeArea(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Practice Areas</option>
              {PRACTICE_AREAS.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded-lg shadow p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><PhoneIncoming size={14} /> Calls</div>
          <p className="text-2xl font-bold text-card-foreground">{totalCalls}</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><UserCheck size={14} /> Qualified</div>
          <p className="text-2xl font-bold text-green-600">{qualifiedCalls}</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><FileText size={14} /> Intakes</div>
          <p className="text-2xl font-bold text-blue-600">{completedIntakes}</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Calendar size={14} /> Bookings</div>
          <p className="text-2xl font-bold text-card-foreground">{totalBookings} / 12</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Clock size={14} /> Talk Time</div>
          <p className="text-2xl font-bold text-card-foreground">{totalTalkTime}m</p>
        </div>
      </div>

      {/* Bulk Actions & Advanced Filters */}
      <div className="bg-card rounded-lg shadow p-4 mb-4 border border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Select All */}
          <div className="flex items-center gap-2">
            <button onClick={toggleAllRecords} className="flex items-center gap-1 text-sm text-card-foreground hover:text-card-foreground/80">
              {selectedRecords.length === filteredRecords.length ? <CheckSquare size={16} /> : <Square size={16} />}
              {selectedRecords.length === filteredRecords.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedRecords.length > 0 && (
              <span className="text-sm text-muted-foreground">({selectedRecords.length} selected)</span>
            )}
          </div>

          {/* Center: Date Range Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-muted-foreground hover:text-card-foreground underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Right: Keyword Search */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by name, phone, email, or practice area..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 w-80"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="p-1.5 hover:bg-muted rounded"
                title="Clear search"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Export Buttons Row */}
        {selectedRecords.length > 0 && (
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground mr-2">Export selected:</span>
            <button onClick={() => exportToCloud('google-drive')} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50">
              <Cloud size={14} /> Google Drive
            </button>
            <button onClick={() => exportToCloud('onedrive')} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50">
              <Cloud size={14} /> OneDrive
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-8"></th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Client</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Phone Line</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Language</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Practice Area</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Qualified</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Booking</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duration</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Transcript</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetails(record)}>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleRecordSelection(record.id)}>
                      {selectedRecords.includes(record.id) ? <CheckSquare size={16} className="text-primary-600" /> : <Square size={16} className="text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-sm text-card-foreground">{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-medium text-card-foreground">{record.clientName}</p>
                    <p className="text-xs text-muted-foreground">{record.clientPhone}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {INBOUND_NUMBERS.find(n => n.number === record.inboundNumber)?.label || record.inboundNumber}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${record.intakeLanguage === 'spanish' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' : 'bg-muted text-muted-foreground'}`}>
                      {record.intakeLanguage.charAt(0).toUpperCase() + record.intakeLanguage.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{record.practiceArea}</td>
                  <td className="px-3 py-3">
                    {record.qualified ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                  </td>
                  <td className="px-3 py-3">
                    {record.bookingStatus === 'consultation_booked' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"><Calendar size={12} /> Booked</span>
                    ) : record.bookingStatus === 'engagement_letter' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"><FileSignature size={12} /> Eng. Letter</span>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">{record.callDuration}m</td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {record.hasTranscript ? (
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openTranscript(record); }} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded" title="View Transcript">
                          <Volume2 size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); downloadTranscript(record); }} className="p-1 text-muted-foreground hover:bg-muted rounded" title="Download">
                          <Download size={14} />
                        </button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">N/A</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Modal */}
      {showTranscriptModal && selectedTranscript && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-card-foreground">Call Transcript</h3>
                <p className="text-sm text-muted-foreground">{selectedTranscript.clientName} - {selectedTranscript.date}</p>
              </div>
              <button onClick={() => { setShowTranscriptModal(false); setIsPlaying(false); }} className="p-1 hover:bg-muted rounded">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Audio Player */}
              <div className="bg-muted rounded-lg p-4 mb-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700">
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <div className="flex-1">
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-primary-500 rounded-full"></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1:23</span>
                      <span>{selectedTranscript.callDuration}:00</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Transcript Text */}
              <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto">
                <p className="text-sm text-card-foreground mb-3"><strong>Benjamin (AI):</strong> Hello, thank you for calling. How can I help you today?</p>
                <p className="text-sm text-card-foreground mb-3"><strong>{selectedTranscript.clientName}:</strong> Hi, I was in a car accident last week and I&apos;m not sure what to do...</p>
                <p className="text-sm text-card-foreground mb-3"><strong>Benjamin (AI):</strong> I&apos;m sorry to hear that. Can you tell me more about the accident?</p>
                <p className="text-sm text-card-foreground"><strong>{selectedTranscript.clientName}:</strong> Yes, I was rear-ended while stopped at a red light...</p>
              </div>
              
              {/* Export Options */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadTranscript(selectedTranscript)} className="flex items-center gap-1 px-3 py-2 text-sm bg-muted text-card-foreground rounded-lg hover:bg-muted/80">
                    <Download size={14} /> Download
                  </button>
                  <button onClick={() => exportToCloud('google-drive', [selectedTranscript.id])} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50">
                    <Cloud size={14} /> Google Drive
                  </button>
                  <button onClick={() => exportToCloud('onedrive', [selectedTranscript.id])} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50">
                    <Cloud size={14} /> OneDrive
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showDetailsModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary-50/50 dark:from-primary-950/20 to-blue-50/50 dark:to-blue-950/20">
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">{selectedRecord.clientName}</h2>
                <p className="text-sm text-muted-foreground mt-1">Call Details & Client Information</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X size={24} className="text-muted-foreground" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
              {/* Contact Information */}
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Phone size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Phone Number</p>
                      <p className="text-sm font-medium text-card-foreground mt-1">{selectedRecord.clientPhone}</p>
                    </div>
                  </div>
                  {selectedRecord.clientEmail && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Mail size={18} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium">Email Address</p>
                        <p className="text-sm font-medium text-card-foreground mt-1">{selectedRecord.clientEmail}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Calendar size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Call Date</p>
                      <p className="text-sm font-medium text-card-foreground mt-1">
                        {new Date(selectedRecord.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Clock size={18} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Call Duration</p>
                      <p className="text-sm font-medium text-card-foreground mt-1">{selectedRecord.callDuration} minutes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call Details */}
              <div className="p-6 border-b border-border bg-muted/30">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">Call Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Inbound Phone Line</p>
                    <p className="text-sm font-medium text-card-foreground">
                      {INBOUND_NUMBERS.find(n => n.number === selectedRecord.inboundNumber)?.label || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedRecord.inboundNumber}</p>
                  </div>
                  <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Intake Language</p>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      selectedRecord.intakeLanguage === 'spanish' 
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {selectedRecord.intakeLanguage.charAt(0).toUpperCase() + selectedRecord.intakeLanguage.slice(1)}
                    </span>
                  </div>
                  <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Practice Area</p>
                    <p className="text-sm font-medium text-card-foreground">{selectedRecord.practiceArea}</p>
                  </div>
                  <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Qualification Status</p>
                    <div className="flex items-center gap-2">
                      {selectedRecord.qualified ? (
                        <>
                          <CheckCircle size={18} className="text-green-500" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">Qualified</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={18} className="text-red-500" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">Not Qualified</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Intake & Booking Status */}
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">Intake &amp; Booking Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-card-foreground">Intake Status</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedRecord.intakeStatus === 'completed' && 'Intake form completed successfully'}
                          {selectedRecord.intakeStatus === 'not_qualified' && 'Did not qualify for intake'}
                          {selectedRecord.intakeStatus === 'pending' && 'Intake in progress'}
                          {selectedRecord.intakeStatus === 'skipped' && 'Intake was skipped'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedRecord.intakeStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                      selectedRecord.intakeStatus === 'not_qualified' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                      selectedRecord.intakeStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {selectedRecord.intakeStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {selectedRecord.bookingStatus && selectedRecord.bookingStatus !== 'none' && (
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        {selectedRecord.bookingStatus === 'consultation_booked' ? (
                          <>
                            <Calendar size={20} className="text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-card-foreground">Consultation Booked</p>
                              {selectedRecord.consultationDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Scheduled for {new Date(selectedRecord.consultationDate).toLocaleDateString('en-US', { 
                                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                                  })}
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <FileSignature size={20} className="text-yellow-600" />
                            <div>
                              <p className="text-sm font-medium text-card-foreground">Engagement Letter Requested</p>
                              <p className="text-xs text-muted-foreground mt-1">Pending client response</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transcript Section */}
              {selectedRecord.hasTranscript && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-card-foreground mb-4">Call Recording &amp; Transcript</h3>
                  <div className="bg-gradient-to-r from-blue-50 dark:from-blue-950/20 to-indigo-50 dark:to-indigo-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Volume2 size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-card-foreground">Recording &amp; Transcript Available</p>
                          <p className="text-xs text-muted-foreground mt-1">Listen to call audio and read full transcript</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setShowDetailsModal(false); openTranscript(selectedRecord); }} 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Play size={16} /> Open Transcript
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-6 border-t border-border bg-muted/30">
                <div className="flex items-center justify-end gap-3">
                  <button 
                    onClick={() => setShowDetailsModal(false)} 
                    className="px-4 py-2 text-card-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Close
                  </button>
                  {selectedRecord.hasTranscript && (
                    <button 
                      onClick={() => downloadTranscript(selectedRecord)} 
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Download size={16} /> Download Transcript
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
