'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@truevow/auth';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">TrueVow</h1>
          <p className="mt-2 text-gray-600">Customer Portal</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Sign In</h2>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                placeholder="you@lawfirm.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                placeholder="Your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-600">
            <Link href="/forgot-password" className="text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-primary-600 hover:text-primary-700">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
