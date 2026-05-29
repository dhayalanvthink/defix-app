import React from 'react';

interface GoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}

export function GoogleButton({ onClick, loading, label = 'Continue with Google' }: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-all hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z" fill="#4285F4"/>
        <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.6559 14.4204 4.6718 12.8372 3.9641 10.71H0.9573V13.0418C2.4382 15.9831 5.4818 18 9 18Z" fill="#34A853"/>
        <path d="M3.9641 10.71C3.7841 10.17 3.6818 9.5931 3.6818 9C3.6818 8.4068 3.7841 7.83 3.9641 7.29V4.9582H0.9573C0.3477 6.1731 0 7.5477 0 9C0 10.4522 0.3477 11.8268 0.9573 13.0418L3.9641 10.71Z" fill="#FBBC05"/>
        <path d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.3441C13.4632 0.8918 11.4259 0 9 0C5.4818 0 2.4382 2.0168 0.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795Z" fill="#EA4335"/>
      </svg>
      {loading ? 'Redirecting...' : label}
    </button>
  );
}