'use client';

import { useState } from 'react';

export interface EnquiryUrlCopyProps {
  label?: string;
  url: string;
  className?: string;
}

export default function EnquiryUrlCopy({
  label = 'Enquiry Form',
  url,
  className = '',
}: EnquiryUrlCopyProps) {
  const [copied, setCopied] = useState(false);

  const canCopy = Boolean(url && url !== 'Loading...');

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent — caller may show toast separately if needed
    }
  };

  if (!url) return null;

  return (
    <div className={`w-full lg:w-auto ${className}`}>
      <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-blue-600">{label}</p>
          <p className="mt-0.5 break-all text-xs font-mono text-blue-800 select-all sm:text-sm">{url}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!canCopy}
          className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
            !canCopy
              ? 'cursor-not-allowed bg-blue-400 text-white opacity-70'
              : copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {copied ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy URL
            </>
          )}
        </button>
      </div>
    </div>
  );
}
