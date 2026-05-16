'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TODO: Call API to send password reset email
      // await sendPasswordResetEmail(email);
      console.log('Sending password reset to:', email);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      setLoading(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Check Your Email
            </h1>
            <p className="text-gray-600 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setStep('request')}
                className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                Resend Email
              </button>
              <Link
                href="/sign-in"
                className="block w-full text-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
            <Lock className="h-6 w-6 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
              placeholder="your.email@lawfirm.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/sign-in" className="text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

