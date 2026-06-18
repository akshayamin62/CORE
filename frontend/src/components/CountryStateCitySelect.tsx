'use client';

import { useEffect, useMemo, useState } from 'react';
import { Country, State, City, ICountry, IState, ICity } from 'country-state-city';

interface CountryStateCitySelectProps {
  country: string;
  state: string;
  city: string;
  onChange: (values: { country: string; state: string; city: string }) => void;
  required?: boolean;
  inputClass?: string;
}

const defaultInputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 md:py-2 md:text-sm';

export default function CountryStateCitySelect({
  country,
  state,
  city,
  onChange,
  required = false,
  inputClass = defaultInputClass,
}: CountryStateCitySelectProps) {
  const countries = useMemo(() => Country.getAllCountries(), []);
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);

  const countryIso = useMemo(
    () => countries.find((c) => c.name === country)?.isoCode || '',
    [countries, country]
  );

  const stateIso = useMemo(
    () => states.find((s) => s.name === state)?.isoCode || '',
    [states, state]
  );

  useEffect(() => {
    if (!countryIso) {
      setStates([]);
      setCities([]);
      return;
    }

    const nextStates = State.getStatesOfCountry(countryIso) || [];
    setStates(nextStates);

    if (!state) {
      setCities([]);
      return;
    }

    const matchedState = nextStates.find((s) => s.name === state);
    if (matchedState) {
      setCities(City.getCitiesOfState(countryIso, matchedState.isoCode) || []);
    } else {
      setCities([]);
    }
  }, [countryIso, state]);

  const handleCountryChange = (isoCode: string) => {
    const selected = countries.find((c) => c.isoCode === isoCode);
    onChange({
      country: selected?.name || '',
      state: '',
      city: '',
    });
  };

  const handleStateChange = (isoCode: string) => {
    const selected = states.find((s) => s.isoCode === isoCode);
    onChange({
      country,
      state: selected?.name || '',
      city: '',
    });
  };

  const handleCityChange = (cityName: string) => {
    onChange({ country, state, city: cityName });
  };

  const requiredMark = required ? <span className="text-red-500"> *</span> : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Country{requiredMark}
        </label>
        <select
          value={countryIso}
          onChange={(e) => handleCountryChange(e.target.value)}
          className={inputClass}
          required={required}
        >
          <option value="">Select country</option>
          {countries.map((c: ICountry) => (
            <option key={c.isoCode} value={c.isoCode}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          State{requiredMark}
        </label>
        <select
          value={stateIso}
          onChange={(e) => handleStateChange(e.target.value)}
          className={inputClass}
          disabled={!countryIso || states.length === 0}
          required={required}
        >
          <option value="">Select state</option>
          {states.map((s) => (
            <option key={s.isoCode} value={s.isoCode}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          City{requiredMark}
        </label>
        <select
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          className={inputClass}
          disabled={!stateIso || cities.length === 0}
          required={required}
        >
          <option value="">Select city</option>
          {cities.map((c) => (
            <option key={`${c.name}-${c.latitude}-${c.longitude}`} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
