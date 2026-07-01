import { Country, State } from 'country-state-city';

export const REFERRER_PHONE_PATTERN =
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;

/** Convert stored country/state names (or legacy iso codes) to form select values */
export function toReferrerFormLocation<T extends Record<string, string>>(data: T): T {
  const countries = Country.getAllCountries();
  const countryMatch =
    countries.find((c) => c.name === data.country) ||
    countries.find((c) => c.isoCode === data.country);

  const countryIso = countryMatch?.isoCode || data.country || '';

  let stateIso = data.state || '';
  if (countryIso) {
    const states = State.getStatesOfCountry(countryIso) || [];
    const stateMatch =
      states.find((s) => s.name === data.state) ||
      states.find((s) => s.isoCode === data.state);
    stateIso = stateMatch?.isoCode || data.state || '';
  }

  return {
    ...data,
    country: countryIso,
    state: stateIso,
    city: data.city || '',
  };
}

/** Convert form iso codes back to names for API / database storage */
export function fromReferrerFormLocation<T extends Record<string, string>>(data: T): T {
  const countries = Country.getAllCountries();
  const country = countries.find((c) => c.isoCode === data.country);
  const countryName = country?.name || data.country;

  let stateName = data.state;
  if (country && data.state) {
    const states = State.getStatesOfCountry(country.isoCode) || [];
    const state = states.find((s) => s.isoCode === data.state);
    stateName = state?.name || data.state;
  }

  return {
    ...data,
    country: countryName,
    state: stateName,
    city: data.city || '',
  };
}

export function applyReferrerFieldChange(
  prev: Record<string, string>,
  key: string,
  value: string
): Record<string, string> {
  const next = { ...prev, [key]: value };
  if (key === 'country') {
    next.state = '';
    next.city = '';
  }
  if (key === 'state') {
    next.city = '';
  }
  return next;
}

export function isValidReferrerPhone(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return REFERRER_PHONE_PATTERN.test(value.trim());
}
