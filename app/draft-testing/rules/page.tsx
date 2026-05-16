"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { draftClient, ValidationRule } from "@/lib/api/draft-client";
import { useTenantDev } from "@/hooks/useTenant";

export default function RulesPage() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenantDev();
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    practice_area: "",
    document_type: "",
    status: "active",
  });

  useEffect(() => {
    loadRules();
  }, [filters, tenantId, tenantLoading]);

  const loadRules = async () => {
    // Wait for tenant context to load
    if (tenantLoading) return;
    
    if (!tenantId) {
      setError(tenantError || "No tenant context available. Please log in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await draftClient.getRules(tenantId, {
        practice_area: filters.practice_area || undefined,
        document_type: filters.document_type || undefined,
        status: filters.status,
        limit: 100,
      });
      setRules(result.rules || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/draft-testing"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block"
          >
            ← Back to Testing Portal
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            📋 Validation Rules
          </h1>
          <p className="text-gray-600 mt-2">
            View and filter validation rules from DRAFT Service
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Practice Area
              </label>
              <select
                value={filters.practice_area}
                onChange={(e) =>
                  setFilters({ ...filters, practice_area: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Practice Areas</option>
                <option value="personal_injury">Personal Injury</option>
                <option value="medical_malpractice">Medical Malpractice</option>
                <option value="employment">Employment</option>
                <option value="family">Family Law</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={filters.document_type}
                onChange={(e) =>
                  setFilters({ ...filters, document_type: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Document Types</option>
                <option value="complaint">Complaint</option>
                <option value="demand_letter">Demand Letter</option>
                <option value="settlement_agreement">Settlement Agreement</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading validation rules...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-900 font-semibold">Error Loading Rules</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <button
                  onClick={loadRules}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Retry →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rules List */}
        {!loading && !error && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Found {rules.length} Rule{rules.length !== 1 ? "s" : ""}
                </h2>
                <button
                  onClick={loadRules}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>

            {rules.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-600">No rules found matching your filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {rule.validator_name}
                          </h3>
                          <span
                            className={`ml-3 px-2 py-1 text-xs font-medium rounded ${
                              rule.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {rule.status}
                          </span>
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {rule.validator_level}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">
                          {rule.error_message}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          {rule.practice_area && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              Practice: {rule.practice_area}
                            </span>
                          )}
                          {rule.document_type && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              Type: {rule.document_type}
                            </span>
                          )}
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            Priority: {rule.priority}
                          </span>
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            Type: {rule.validator_type}
                          </span>
                        </div>
                        {rule.warning_message && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                              <strong>Warning:</strong> {rule.warning_message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

