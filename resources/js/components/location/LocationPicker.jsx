import React, { useEffect, useMemo, useState } from 'react';
import { useCountries } from '../../hooks/useCountries';
import { useRegions } from '../../hooks/useRegions';
import { useCities } from '../../hooks/useCities';
import CountrySelect from './CountrySelect';
import RegionSelect from './RegionSelect';
import CitySelect from './CitySelect';

const ADMIN_SELECT_CLASS =
  'location-admin-select w-full px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer disabled:cursor-not-allowed';

export default function LocationPicker({
  countryId,
  regionId,
  cityId,
  onCountryChange,
  onRegionChange,
  onCityChange,
  className = 'grid grid-cols-1 sm:grid-cols-3 gap-3',
  selectClassName,
  selectStyle,
  variant = 'auth',
  showLabels = true,
  t,
}) {
  const { countries, loading: loadingCountries } = useCountries();
  const { regions, loading: loadingRegions } = useRegions(countryId);
  const { cities, loading: loadingCities } = useCities(regionId);

  const resolvedSelectClass = selectClassName || (variant === 'admin' ? ADMIN_SELECT_CLASS : undefined);
  const sharedSelectProps = {
    ...(resolvedSelectClass ? { selectClassName: resolvedSelectClass } : {}),
    ...(selectStyle ? { selectStyle } : {}),
    ...(t ? { t } : {}),
  };

  useEffect(() => {
    if (variant !== 'auth') return;
    if (countryId || !countries.length) return;
    const india = countries.find((c) => c.code === 'IN' || c.name === 'India');
    const defaultCountry = india || countries[0];
    if (defaultCountry) {
      onCountryChange?.(String(defaultCountry.id));
    }
  }, [variant, countries, countryId, onCountryChange]);

  return (
    <div className={className}>
      <CountrySelect
        label={showLabels && variant === 'auth' ? 'Country' : ''}
        value={countryId}
        onChange={(e) => onCountryChange?.(e.target.value)}
        countries={countries}
        loading={loadingCountries}
        {...sharedSelectProps}
      />
      <RegionSelect
        label={showLabels && variant === 'auth' ? 'State' : ''}
        value={regionId}
        onChange={(e) => onRegionChange?.(e.target.value)}
        regions={regions}
        loading={loadingRegions}
        disabled={!countryId}
        placeholder={!countryId ? 'Select country first' : 'Select State'}
        {...sharedSelectProps}
      />
      <CitySelect
        label={showLabels && variant === 'auth' ? 'City' : ''}
        value={cityId}
        onChange={(e) => onCityChange?.(e.target.value)}
        cities={cities}
        loading={loadingCities}
        disabled={!regionId}
        placeholder={!regionId ? 'Select state first' : 'Select City'}
        {...sharedSelectProps}
      />
    </div>
  );
}

export function useLocationPickerState(initial = {}) {
  const [countryId, setCountryId] = useState(initial.countryId || '');
  const [regionId, setRegionId] = useState(initial.regionId || '');
  const [cityId, setCityId] = useState(initial.cityId || '');

  const handleCountryChange = (value) => {
    setCountryId(value);
    setRegionId('');
    setCityId('');
  };

  const handleRegionChange = (value) => {
    setRegionId(value);
    setCityId('');
  };

  return {
    countryId,
    regionId,
    cityId,
    setCountryId,
    setRegionId,
    setCityId,
    handleCountryChange,
    handleRegionChange,
    handleCityChange: setCityId,
    payload: useMemo(
      () => ({
        country_id: countryId ? Number(countryId) : null,
        region_id: regionId ? Number(regionId) : null,
        city_id: cityId ? Number(cityId) : null,
      }),
      [countryId, regionId, cityId]
    ),
  };
}
