'use client';
import { SignOutButton } from '@clerk/nextjs';

export default function NoTenantPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Account Not Configured
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your account is not associated with any organization. Please contact your administrator or TrueVow support to complete your account setup.
        </p>
        
        <div className="space-y-3">
          <a
            href="mailto:support@truevow.com"
            className="block w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Contact Support
          </a>
          
          <SignOutButton redirectUrl="/sign-in">
            <button className="block w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
