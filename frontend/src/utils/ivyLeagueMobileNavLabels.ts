const IVY_MOBILE_NAV_LABELS: Record<string, string> = {
  Dashboard: 'Home',
  Documents: 'Docs',
  'Academic Excellence': 'Pointer 1',
  'Spike in one area': 'Pointer 2',
  'Leadership & Initiative': 'Pointer 3',
  'Global or Social Impact': 'Pointer 4',
  'Authentic & Reflective Storytelling': 'Pointer 5',
  'Engagement with Learning & Intellectual Curiosity': 'Pointer 6',
};

export function ivyLeagueMobileNavLabel(name: string): string {
  return IVY_MOBILE_NAV_LABELS[name] ?? name;
}

export function buildIvyStudentDashboardHref(options?: {
  studentId?: string | null;
  readOnly?: boolean;
}): string {
  const qs = new URLSearchParams();
  if (options?.studentId) {
    qs.set('studentId', options.studentId);
    if (options.readOnly) qs.set('readOnly', 'true');
  }
  const query = qs.toString();
  return `/ivy-league/student${query ? `?${query}` : ''}`;
}
