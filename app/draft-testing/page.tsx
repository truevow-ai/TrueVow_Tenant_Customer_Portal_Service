"use client";

import { useState } from "react";
import Link from "next/link";

export default function DraftTestingHome() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🧪 DRAFT Testing Portal
              </h1>
              <p className="text-gray-600 mt-2">
                Isolated testing environment for DRAFT Service integration
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Port 3002 • Connected to Tenant App (8000) → DRAFT Service (8003)
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Test Tenant ID</div>
              <div className="text-lg font-mono text-gray-900">
                00000000-0000-0000-0000-000000000001
              </div>
            </div>
          </div>
        </div>

        {/* Test Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Scenario 1: View Rules */}
          <Link href="/draft-testing/rules">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    View Validation Rules
                  </h3>
                  <p className="text-sm text-gray-500">Test Scenario 1</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Retrieve and display validation rules from DRAFT Service filtered by practice area and document type.
              </p>
              <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                Start Test →
              </div>
            </div>
          </Link>

          {/* Scenario 2: Validate Document */}
          <Link href="/draft-testing/validate">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Validate Document
                  </h3>
                  <p className="text-sm text-gray-500">Test Scenario 2</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Upload or paste document content and validate against selected rules. View errors and warnings.
              </p>
              <div className="mt-4 flex items-center text-green-600 text-sm font-medium">
                Start Test →
              </div>
            </div>
          </Link>

          {/* Scenario 3: View History */}
          <Link href="/draft-testing/history">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Validation History
                  </h3>
                  <p className="text-sm text-gray-500">Test Scenario 3</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                View past validation attempts with filtering by date and status. See detailed results.
              </p>
              <div className="mt-4 flex items-center text-purple-600 text-sm font-medium">
                Start Test →
              </div>
            </div>
          </Link>

          {/* Health Check */}
          <Link href="/draft-testing/health">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-yellow-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏥</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Health Check
                  </h3>
                  <p className="text-sm text-gray-500">System Status</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Check connectivity to Tenant Application and DRAFT Service. View system health.
              </p>
              <div className="mt-4 flex items-center text-yellow-600 text-sm font-medium">
                Check Status →
              </div>
            </div>
          </Link>

          {/* API Documentation */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📖</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  API Documentation
                </h3>
                <p className="text-sm text-gray-500">Reference</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              View API endpoints, request/response formats, and integration details.
            </p>
            <div className="space-y-2">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-800"
              >
                Tenant App API Docs →
              </a>
              <a
                href="http://localhost:8003/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-800"
              >
                DRAFT Service API Docs →
              </a>
            </div>
          </div>

          {/* Test Data */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🗂️</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Test Data
                </h3>
                <p className="text-sm text-gray-500">Sample Documents</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Pre-configured test documents and validation scenarios.
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <div>• Personal Injury Complaint</div>
              <div>• Medical Malpractice Demand</div>
              <div>• Settlement Agreement</div>
            </div>
          </div>
        </div>

        {/* Architecture Diagram */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Testing Architecture
          </h2>
          <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm">
            <pre className="text-gray-700">
{`┌─────────────────────────────────────────────────────────┐
│              DRAFT TESTING FLOW                         │
└─────────────────────────────────────────────────────────┘

1️⃣  DRAFT Testing Portal (Port 3002)
    │
    │ HTTP Request
    │
    ↓
2️⃣  Tenant Application (Port 8000)
    │  /api/v1/draft/*
    │
    │ Proxy Request
    │
    ↓
3️⃣  DRAFT Service (Port 8003)
    │  Validation Engine
    │
    │ Database Query
    │
    ↓
4️⃣  Supabase Database
    │  draft schema
    │  12 tables
    └─ Validation results`}
            </pre>
          </div>
        </div>

        {/* Quick Start Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            🚀 Quick Start
          </h2>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="font-semibold mr-2">1.</span>
              <span>
                Ensure DRAFT Service is running on port 8003
                <code className="ml-2 bg-white px-2 py-1 rounded text-sm">
                  cd 2025-TrueVow-Draft-Service && python -m uvicorn app.main:app --port 8003
                </code>
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">2.</span>
              <span>
                Ensure Tenant Application is running on port 8000
                <code className="ml-2 bg-white px-2 py-1 rounded text-sm">
                  cd 2025-TrueVow-Tenant-Application && python -m uvicorn app.main:app --port 8000
                </code>
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">3.</span>
              <span>
                This portal is running on port 3002
                <code className="ml-2 bg-white px-2 py-1 rounded text-sm">
                  npm run dev:draft
                </code>
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">4.</span>
              <span>Click on any test scenario above to begin testing</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

