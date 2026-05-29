import React from 'react';
import { Link } from 'react-router';
import { Logo } from '../Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] via-white to-[#F0FDF8] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#15DB95]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#080F5B]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="w-14 h-14 mb-4">
            <Logo className="w-full h-full" />
          </Link>
          <h1 className="text-2xl font-bold text-[#080F5B] tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1.5 text-center max-w-xs">{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.06)] rounded-2xl p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Defix</span>
          <span>&middot;</span>
          <Link to="/terms" className="hover:text-slate-700 transition-colors">Terms &amp; Conditions</Link>
          <span>&middot;</span>
          <Link to="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}