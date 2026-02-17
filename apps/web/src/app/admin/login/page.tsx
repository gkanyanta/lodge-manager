'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
  token: string;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tenantSlug = getTenantSlugFromClient();
      const data = await api.post<LoginResponse>(
        '/auth/login',
        { email, password },
        { tenantSlug },
      );

      localStorage.setItem('lodge_user', JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem('lodge_token', data.token);
      }

      router.push('/admin/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        {/* Lodge branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-xl font-bold text-white">
            LM
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Lodge Manager</h1>
          <p className="mt-1 text-sm text-stone-500">Sign in to your admin account</p>
        </div>

        {/* Login form card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              required
              placeholder="admin@lodge.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
