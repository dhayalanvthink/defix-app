import React from 'react';
import { Link } from 'react-router';
import { Logo } from '../Logo';
import { ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
}

export function LegalLayout({ children, title, lastUpdated }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] via-white to-[#F0FDF8]">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#15DB95]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#080F5B]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/login" className="self-start flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#080F5B] transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
          <div className="w-12 h-12 mb-4">
            <Logo className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-bold text-[#080F5B] tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 mt-1.5">Last updated: {lastUpdated}</p>
        </div>

        {/* Content card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.06)] rounded-2xl p-8 md:p-10">
          <div className="prose prose-slate prose-sm max-w-none
            [&_h2]:text-[#080F5B] [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:first:mt-0
            [&_h3]:text-[#080F5B] [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3
            [&_ul]:text-slate-600 [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_ul]:pl-5
            [&_li]:leading-relaxed
            [&_strong]:text-slate-700 [&_strong]:font-semibold
            [&_a]:text-[#15DB95] [&_a]:no-underline hover:[&_a]:text-[#12c487]
          ">
            {children}
          </div>
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