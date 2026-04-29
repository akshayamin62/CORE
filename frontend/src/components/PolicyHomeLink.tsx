'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const REVIEWER_EMAIL = 'reviewer@admitra.io';

export default function PolicyHomeLink() {
  const [href, setHref] = useState('/');

  useEffect(() => {
    // Always use home page for all users including reviewers
    setHref('/');
  }, []);

  return (
    <Link href={href} className="hover:text-white transition-colors">
      Home
    </Link>
  );
}
