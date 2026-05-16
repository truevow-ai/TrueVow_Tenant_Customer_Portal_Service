'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, Calendar, DollarSign, Filter } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export default function InvoicesPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Mock invoices data - empty for now since first 3 months are free
  const invoices: Invoice[] = [
    // No invoices yet - first 3 months are free
  ];

  // Example invoice structure for when billing starts
  const exampleInvoice: Invoice = {
    id: 'inv_example',
    invoiceNumber: 'INV-2026-001',
    date: '2026-05-17',
    dueDate: '2026-06-01',
    amount: 312, // 8 bookings x $39
    status: 'pending',
    items: [
      { description: 'Intake + Booking (8 bookings)', quantity: 8, unitPrice: 39, total: 312 }
    ]
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/dashboard/billing" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Billing
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-2 text-gray-600">
          View and download your past invoices
        </p>
      </div>

      {/* Free Tier Notice */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Free Trial Period Active
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              You're currently in your first 3 months with 12 free Intakes + Bookings included.
              No invoices will be generated during this period.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-blue-600">Trial Ends:</span>
                <span className="font-medium text-blue-900 ml-1">May 17, 2026</span>
              </div>
              <div>
                <span className="text-blue-600">Free Bookings Used:</span>
                <span className="font-medium text-blue-900 ml-1">8 / 12</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices Yet</h3>
          <p className="text-gray-500 mb-6">
            Your invoices will appear here once your free trial period ends.
          </p>
          
          {/* Example Invoice Preview */}
          <div className="max-w-md mx-auto mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Example Invoice Structure</p>
            <div className="bg-white rounded border p-4 text-left">
              <div className="flex justify-between items-start mb-3 pb-3 border-b">
                <div>
                  <p className="font-semibold text-gray-900">{exampleInvoice.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{new Date(exampleInvoice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                  Pending
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                {exampleInvoice.items[0].description}
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm text-gray-500">Total Due</span>
                <span className="text-lg font-bold text-gray-900">${exampleInvoice.amount}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-semibold text-gray-900">${invoice.amount}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      invoice.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : invoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
                      <Download size={16} />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
