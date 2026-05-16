'use client';

import { useState } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface CompanyStats {
  companyName: string;
  plan: string;
  planBadge?: string;
  teamMembers: number;
  activeServices: number;
  bookingsCompleted: number; // Changed from monthlyUsage
  bookingsLimit: number; // Changed from usageLimit
  freeBookingsRemaining: number; // Track free bookings
  accountStatus: 'active' | 'suspended' | 'pending';
  lastInvoiceStatus: 'paid' | 'overdue' | 'pending' | 'no_invoice';
  lastInvoiceDate?: string;
  lastInvoiceAmount?: number;
}

interface CompanyStatsSidebarProps {
  stats?: CompanyStats;
}

const defaultStats: CompanyStats = {
  companyName: 'Your Law Firm',
  plan: 'Foundation',
  planBadge: '12 Free Bookings',
  teamMembers: 5,
  activeServices: 1, // INTAKE is always active
  bookingsCompleted: 8, // Intakes + Bookings this month
  bookingsLimit: 12, // 12 free bookings limit
  freeBookingsRemaining: 4, // 4 free bookings left
  accountStatus: 'active',
  lastInvoiceStatus: 'no_invoice', // No invoice yet (first 3 months free)
  lastInvoiceDate: undefined,
  lastInvoiceAmount: undefined,
};

export function CompanyStatsSidebar({ stats = defaultStats }: CompanyStatsSidebarProps) {
  const [showStatusDefinitions, setShowStatusDefinitions] = useState(false);
  const [showCompanyStats, setShowCompanyStats] = useState(true);

  const bookingsPercentage = Math.round((stats.bookingsCompleted / stats.bookingsLimit) * 100);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended':
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'no_invoice':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return <CheckCircle2 size={14} className="text-green-600" />;
      case 'suspended':
      case 'overdue':
        return <XCircle size={14} className="text-red-600" />;
      case 'pending':
        return <Clock size={14} className="text-yellow-600" />;
      default:
        return <AlertCircle size={14} className="text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Company Info Card */}
      <div className="rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Building2 size={20} className="text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{stats.companyName}</h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-200 text-primary-800">
                {stats.plan} Plan
              </span>
              {stats.planBadge && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {stats.planBadge}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/60 rounded p-2">
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Users size={12} />
              <span>Team</span>
            </div>
            <p className="font-semibold text-gray-900">{stats.teamMembers} members</p>
          </div>
          <div className="bg-white/60 rounded p-2">
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Activity size={12} />
              <span>Services</span>
            </div>
            <p className="font-semibold text-gray-900">{stats.activeServices} active</p>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <button
          onClick={() => setShowCompanyStats(!showCompanyStats)}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-600" />
            <span className="font-medium text-gray-900 text-sm">Monthly Usage</span>
          </div>
          {showCompanyStats ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        
        {showCompanyStats && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Intakes + Bookings</span>
                <span className="font-medium text-gray-900">{stats.bookingsCompleted} / {stats.bookingsLimit} free</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    bookingsPercentage > 90 ? 'bg-red-500' : 
                    bookingsPercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${bookingsPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">{stats.freeBookingsRemaining} free bookings remaining</p>
                {bookingsPercentage >= 100 && (
                  <p className="text-xs text-red-600 font-medium">$39/booking after</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-primary-600" />
          <span className="font-medium text-gray-900 text-sm">Account Status</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Account</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(stats.accountStatus)}`}>
              {getStatusIcon(stats.accountStatus)}
              {stats.accountStatus.charAt(0).toUpperCase() + stats.accountStatus.slice(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Last Invoice</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(stats.lastInvoiceStatus)}`}>
              {getStatusIcon(stats.lastInvoiceStatus)}
              {stats.lastInvoiceStatus === 'no_invoice' 
                ? 'No Invoice Yet' 
                : stats.lastInvoiceStatus.charAt(0).toUpperCase() + stats.lastInvoiceStatus.slice(1)}
            </span>
          </div>
          {stats.lastInvoiceDate && stats.lastInvoiceAmount && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Date:</span>
                <span className="font-medium">{stats.lastInvoiceDate}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Amount:</span>
                <span className="font-medium">${stats.lastInvoiceAmount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Definitions */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowStatusDefinitions(!showStatusDefinitions)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info size={16} className="text-primary-600" />
            <span className="font-medium text-gray-900 text-sm">Status Definitions</span>
          </div>
          {showStatusDefinitions ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        
        {showStatusDefinitions && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            {/* Account Statuses */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Account Status</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Active</p>
                    <p className="text-xs text-gray-500">Full access to all features and services</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={12} className="text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Pending</p>
                    <p className="text-xs text-gray-500">Account setup in progress, limited access</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle size={12} className="text-red-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Suspended</p>
                    <p className="text-xs text-gray-500">Access restricted, contact support</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Statuses */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Billing Status</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Paid</p>
                    <p className="text-xs text-gray-500">All invoices paid, account in good standing</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle size={12} className="text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Pending</p>
                    <p className="text-xs text-gray-500">Payment processing or invoice pending</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle size={12} className="text-red-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Overdue</p>
                    <p className="text-xs text-gray-500">Payment overdue, please update billing info</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Statuses */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Service Status</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Operational</p>
                    <p className="text-xs text-gray-500">Service running normally</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Degraded</p>
                    <p className="text-xs text-gray-500">Minor issues, may affect performance</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Down</p>
                    <p className="text-xs text-gray-500">Service unavailable, check status page</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}