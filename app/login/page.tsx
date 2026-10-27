'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const { token, hasHydrated, login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (value: string) => {
    if (!value) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Please enter a valid email address';
  };
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, token, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const emailValidation = validateEmail(email);
    if (emailValidation) { setEmailError(emailValidation); return; }
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { errorMessage?: string; message?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.errorMessage ||
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden">
      {/* Background office photo matching Figma */}
      <Image
        src="/login-bg.jpg"
        alt="Office Background"
        fill
        className="object-cover object-center -z-20"
        priority
      />

      {/* Dark overlay: rgba(0, 0, 0, 0.4) matching Figma exactly */}
      <div className="absolute inset-0 bg-black/40 -z-10" />

      {/* Main Content: Left headline + Right card (1110px max width) */}
      <div className="w-full max-w-[1110px] flex flex-col md:flex-row md:items-center md:justify-between gap-12 z-10 px-4">
        {/* Left Headline */}
        <div className="text-white space-y-2">
          <h1 className="text-[32px] sm:text-[36px] font-semibold leading-[40px] tracking-[0.02em]">
            Welcome to the<br />
            Crowd Management System
          </h1>
        </div>

        {/* Right Floating Card: 360px wide, 8px rounded corners */}
        <div className="w-[360px] max-w-full bg-white rounded-lg shadow-2xl overflow-hidden self-center md:self-auto shrink-0">
          {/* Card Top Banner: 374x110 SVG header with Kloudspot logo */}
          <div className="relative w-full h-[110px] overflow-hidden">
            <Image
              src="/login-header.svg"
              alt="Kloudspot"
              fill
              priority
              className="object-cover"
            />
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {error && (
              <div
                role="alert"
                className="p-2.5 text-xs text-rose-700 bg-rose-50 rounded-md border border-rose-200"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 pt-1">
              {/* Field 1: Log In */}
              <div className="relative">
                <label
                  htmlFor="email"
                  className="absolute -top-2.5 left-2 bg-white px-1 text-[12px] font-medium text-[rgba(13,13,13,0.64)] z-10"
                >
                  Log In *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(validateEmail(e.target.value)); }}
                  onBlur={(e) => setEmailError(validateEmail(e.target.value))}
                  placeholder="you@example.com"
                  className={`w-full px-3 py-2.5 border rounded-[2px] text-[12px] font-medium text-[#030303] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 ${emailError ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : 'border-[#0D0D0D1A] focus:border-[#009490] focus:ring-[#009490]'}`}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="mt-1 text-[11px] text-rose-600">{emailError}</p>
                )}
              </div>

              {/* Field 2: Password */}
              <div className="relative">
                <label
                  htmlFor="password"
                  className="absolute -top-2.5 left-2 bg-white px-1 text-[12px] font-medium text-[rgba(13,13,13,0.64)] z-10"
                >
                  Password *
                </label>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="**********"
                  className="w-full px-3 py-2.5 pr-10 border border-[#0D0D0D1A] rounded-[2px] text-[12px] font-medium text-[#030303] placeholder-[#9CA3AF] focus:outline-none focus:border-[#009490] focus:ring-1 focus:ring-[#009490]"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Image
                    src="/icons/eye.svg"
                    alt="Toggle visibility"
                    width={18}
                    height={17}
                  />
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[42px] bg-[#009490] hover:bg-[#007d7a] text-white rounded-lg text-base font-normal tracking-[0.0275em] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
