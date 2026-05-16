"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { draftClient } from "@/lib/api/draft-client";

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 10 seconds
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await draftClient.healthCheck();
      setHealth(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Health check failed");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const isHealthy = health?.status === "healthy";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/draft-testing"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block"
          >
            ← Back to Testing Portal
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            🏥 System Health Check
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor connectivity to Tenant Application and DRAFT Service
          </p>
        </div>

        {/* Health Status Card */}
        <div
          className={`rounded-lg shadow-sm p-6 mb-6 border-2 ${
            isHealthy
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-4xl mr-4">
                {isHealthy ? "✅" : "❌"}
              </span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isHealthy ? "All Systems Operational" : "System Unavailable"}
                </h2>
                <p className="text-gray-600 mt-1">
                  {isHealthy
                    ? "Tenant Application and DRAFT Service are connected"
                    : "Unable to connect to services"}
                </p>
              </div>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? "Checking..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !health && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Checking system health...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-900 font-semibold">Health Check Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Health Details */}
        {health && (
          <div className="space-y-6">
            {/* Tenant Application Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Tenant Application (Port 8000)
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Endpoint</span>
                  <span className="font-mono text-sm text-gray-900">
                    {process.env.NEXT_PUBLIC_TENANT_APP_API_URL || "http://localhost:8000"}
                  </span>
                </div>
              </div>
            </div>

            {/* DRAFT Service Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                DRAFT Service (Port 8003)
              </h3>
              {health.draft_service ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        health.draft_service.status === "healthy"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {health.draft_service.status || "Unknown"}
                    </span>
                  </div>
                  {health.draft_service.database && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Database</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          health.draft_service.database === "connected"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {health.draft_service.database}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  DRAFT Service health information not available
                </div>
              )}
            </div>

            {/* System Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                System Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Check</span>
                  <span className="text-gray-900">
                    {new Date(health.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Test Tenant ID</span>
                  <span className="font-mono text-gray-900">
                    00000000-0000-0000-0000-000000000001
                  </span>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            {!isHealthy && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-4">
                  Troubleshooting
                </h3>
                <ol className="space-y-2 text-sm text-yellow-800">
                  <li>
                    1. Ensure DRAFT Service is running:
                    <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                      cd 2025-TrueVow-Draft-Service && python -m uvicorn app.main:app --port 8003
                    </code>
                  </li>
                  <li>
                    2. Ensure Tenant Application is running:
                    <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                      cd 2025-TrueVow-Tenant-Application && python -m uvicorn app.main:app --port 8000
                    </code>
                  </li>
                  <li>
                    3. Check that DRAFT_SERVICE_URL and DRAFT_SERVICE_API_KEY are set in Tenant Application .env
                  </li>
                  <li>
                    4. Verify network connectivity between services
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

