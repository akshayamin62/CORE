import { FilterOption } from '@/components/ListPageFilters';

export const ACTIVE_STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Status', mobileLabel: 'All' },
  { value: 'active', label: 'Active', mobileLabel: 'Active' },
  { value: 'inactive', label: 'Inactive', mobileLabel: 'Inactive' },
];

export const ALL_ACTIVE_INACTIVE_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Status', mobileLabel: 'All' },
  { value: 'active', label: 'Active', mobileLabel: 'Active' },
  { value: 'inactive', label: 'Inactive', mobileLabel: 'Inactive' },
];
