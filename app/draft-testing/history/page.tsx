"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { draftClient, ValidationHistory } from "@/lib/api/draft-client";
import { useTenantDev } from "@/hooks/useTenant";

export default function HistoryPage() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenantDev();
  const [history, setHistory] = useState<ValidationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedValidation, setSelectedValidation] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [tenantId, tenantLoading]);

  const loadHistory = async () => {
    // Wait for tenant context to load
    if (tenantLoading) return;
    
    if (!tenantId) {
      setError(tenantError || "No tenant context available. Please log in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await draftClient.getHistory(tenantId, { limit: 50 });
      setHistory(result.validations || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (validationId: string) => {
    if (!tenantId) {
      setError("No tenant context available. Please log in.");
      return;
    }
    if (selectedValidation === validationId && validationDetails) {
      setSelectedValidation(null);
      setValidationDetails(null);
      return;
    }

    setSelectedValidation(validationId);
    setLoadingDetails(true);
    try {
      const details = await draftClient.getValidationDetails(tenantId, validationId);
      setValidationDetails(details);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to load details");
    } finally {
      setLoadingDetails(false);
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
            📊 Validation History
          </h1>
          <p className="text-gray-600 mt-2">
            View past validation attempts and detailed results
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading validation history...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-900 font-semibold">Error Loading History</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <button
                  onClick={loadHistory}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Retry →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {!loading && !error && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {history.length} Validation{history.length !== 1 ? "s" : ""}
                </h2>
                <button
                  onClick={loadHistory}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-600">No validation history found.</p>
                <Link
                  href="/draft-testing/validate"
                  className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
                >
                  Run your first validation →
                </Link>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.validation_id}
                  className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Validation #{item.validation_id.slice(0, 8)}
                        </h3>
                        <span
                          className={`ml-3 px-2 py-1 text-xs font-medium rounded ${
                            item.is_valid
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.is_valid ? "Valid" : "Invalid"}
                        </span>
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {item.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                        {item.document_type && (
                          <span>Type: {item.document_type}</span>
                        )}
                        {item.practice_area && (
                          <span>• Practice: {item.practice_area}</span>
                        )}
                        <span>• {item.error_count} errors</span>
                        <span>• {item.warning_count} warnings</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => loadDetails(item.validation_id)}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {selectedValidation === item.validation_id
                        ? "Hide Details"
                        : "View Details"}
                    </button>
                  </div>

                  {/* Details Panel */}
                  {selectedValidation === item.validation_id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      {loadingDetails ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <p className="mt-2 text-gray-600 text-sm">Loading details...</p>
                        </div>
                      ) : validationDetails ? (
                        <div className="space-y-4">
                          {/* Errors */}
                          {validationDetails.result.errors.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Errors ({validationDetails.result.errors.length})
                              </h4>
                              <div className="space-y-2">
                                {validationDetails.result.errors.map(
                                  (err: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-red-50 border-l-4 border-red-500 p-3 rounded"
                                    >
                                      <div className="font-medium text-red-900 text-sm">
                                        {err.rule_name || "Error"}
                                      </div>
                                      <div className="text-xs text-red-700 mt-1">
                                        {err.message}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Warnings */}
                          {validationDetails.result.warnings.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Warnings ({validationDetails.result.warnings.length})
                              </h4>
                              <div className="space-y-2">
                                {validationDetails.result.warnings.map(
                                  (warn: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded"
                                    >
                                      <div className="font-medium text-yellow-900 text-sm">
                                        {warn.rule_name || "Warning"}
                                      </div>
                                      <div className="text-xs text-yellow-700 mt-1">
                                        {warn.message}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                              Metadata
                            </h4>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>
                                Validation ID: {validationDetails.validation.validation_id}
                              </div>
                              <div>
                                Timestamp:{" "}
                                {new Date(
                                  validationDetails.result.timestamp
                                ).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          Failed to load details
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

