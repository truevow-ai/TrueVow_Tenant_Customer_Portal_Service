"use client";

import { useState } from "react";
import Link from "next/link";
import { draftClient, ValidationResult, SAMPLE_DOCUMENTS } from "@/lib/api/draft-client";
import { useTenantDev } from "@/hooks/useTenant";

export default function ValidatePage() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenantDev();
  const [content, setContent] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    // Wait for tenant context to load
    if (tenantLoading) {
      setError("Loading tenant context...");
      return;
    }
    
    if (!tenantId) {
      setError(tenantError || "No tenant context available. Please log in.");
      return;
    }
    if (!content.trim()) {
      setError("Please enter document content");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const validationResult = await draftClient.validateDocument(tenantId, {
        content,
        document_type: documentType || undefined,
        practice_area: practiceArea || undefined,
      });
      setResult(validationResult);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Validation failed");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (key: keyof typeof SAMPLE_DOCUMENTS) => {
    const sample = SAMPLE_DOCUMENTS[key];
    setContent(sample.content);
    setDocumentType(sample.document_type);
    setPracticeArea(sample.practice_area);
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
            ✅ Document Validation
          </h1>
          <p className="text-gray-600 mt-2">
            Validate document content against DRAFT Service rules
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Sample Documents */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Sample Documents
              </h2>
              <div className="space-y-2">
                {Object.entries(SAMPLE_DOCUMENTS).map(([key, doc]) => (
                  <button
                    key={key}
                    onClick={() => loadSample(key as keyof typeof SAMPLE_DOCUMENTS)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{doc.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {doc.practice_area} • {doc.document_type}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Input */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Document Content
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practice Area
                  </label>
                  <select
                    value={practiceArea}
                    onChange={(e) => setPracticeArea(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Practice Area (Optional)</option>
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
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Document Type (Optional)</option>
                    <option value="complaint">Complaint</option>
                    <option value="demand_letter">Demand Letter</option>
                    <option value="settlement_agreement">Settlement Agreement</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste or type document content here..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 h-64 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {content.length} characters
                  </p>
                </div>
                <button
                  onClick={handleValidate}
                  disabled={loading || !content.trim()}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Validating..." : "Validate Document"}
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                  <span className="text-red-600 text-xl mr-3">⚠️</span>
                  <div>
                    <h3 className="text-red-900 font-semibold">Validation Error</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Validation Results
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      result.is_valid
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {result.is_valid ? "Valid" : "Invalid"}
                  </span>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {result.errors.length}
                    </div>
                    <div className="text-sm text-red-700">Errors</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                      {result.warnings.length}
                    </div>
                    <div className="text-sm text-yellow-700">Warnings</div>
                  </div>
                </div>

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Errors
                    </h3>
                    <div className="space-y-3">
                      {result.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="bg-red-50 border-l-4 border-red-500 p-4 rounded"
                        >
                          <div className="font-medium text-red-900">
                            {err.rule_name || "Validation Error"}
                          </div>
                          <div className="text-sm text-red-700 mt-1">
                            {err.message}
                          </div>
                          {err.location && (
                            <div className="text-xs text-red-600 mt-2">
                              Location: Line {err.location.line}, Column{" "}
                              {err.location.column}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Warnings
                    </h3>
                    <div className="space-y-3">
                      {result.warnings.map((warn, idx) => (
                        <div
                          key={idx}
                          className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded"
                        >
                          <div className="font-medium text-yellow-900">
                            {warn.rule_name || "Validation Warning"}
                          </div>
                          <div className="text-sm text-yellow-700 mt-1">
                            {warn.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {result.is_valid && result.errors.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-green-600 text-xl mr-3">✓</span>
                      <div>
                        <div className="font-medium text-green-900">
                          Document is valid!
                        </div>
                        <div className="text-sm text-green-700 mt-1">
                          No errors found. {result.warnings.length > 0 && `${result.warnings.length} warning(s) noted.`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Validation ID: {result.validation_id}</div>
                    <div>Timestamp: {new Date(result.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!result && !error && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center border-2 border-dashed border-gray-300">
                <p className="text-gray-500">
                  Enter document content and click "Validate Document" to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

