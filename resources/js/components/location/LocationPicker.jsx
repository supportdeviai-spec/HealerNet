import React, { useEffect, useMemo, useState } from 'react';
import { useCountries } from '../../hooks/useCountries';
import { useRegions } from '../../hooks/useRegions';
import { useCities } from '../../hooks/useCities';
import CountrySelect from './CountrySelect';
import RegionSelect from './RegionSelect';
import CitySelect from './CitySelect';

const ADMIN_SELECT_CLASS =
  'location-admin-select w-full px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer disabled:cursor-not-allowed';

const DEFAULT_REGION_LABEL = 'State/Province';
const DEFAULT_CITY_LABEL = 'District';

// What a country calls its region / city level (set via Excel import or admin panel),
// e.g. UAE → "Emirate" / "City / Area". Falls back to State/Province and District.
export function getLocationLabels(country) {
  return {
    region: String(country?.region_label || '').trim() || DEFAULT_REGION_LABEL,
    city: String(country?.city_label || '').trim() || DEFAULT_CITY_LABEL,
  };
}

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
  labelClassName,
  cityPlaceholder,
  cityLoadingPlaceholder,
  t,
}) {
  const { countries, loading: loadingCountries } = useCountries();
  const { regions, loading: loadingRegions } = useRegions(countryId);
  const { cities, loading: loadingCities } = useCities(regionId);

  const selectedCountry = variant === 'auth'
    ? countries.find((c) => String(c.id) === String(countryId))
    : null;
  const labels = getLocationLabels(selectedCountry);
  const hasCustomCityLabel = labels.city !== DEFAULT_CITY_LABEL;

  const resolvedSelectClass = selectClassName || (variant === 'admin' ? ADMIN_SELECT_CLASS : undefined);
  const sharedSelectProps = {
    ...(resolvedSelectClass ? { selectClassName: resolvedSelectClass } : {}),
    ...(selectStyle ? { selectStyle } : {}),
    ...(labelClassName ? { labelClassName } : {}),
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
        label={showLabels && variant === 'auth' ? labels.region : ''}
        value={regionId}
        onChange={(e) => onRegionChange?.(e.target.value)}
        regions={regions}
        loading={loadingRegions}
        disabled={!countryId}
        placeholder={!countryId ? 'Select country first' : (showLabels ? 'Select' : `Select ${labels.region}`)}
        {...sharedSelectProps}
      />
      <CitySelect
        label={showLabels && variant === 'auth' ? labels.city : ''}
        value={cityId}
        onChange={(e) => onCityChange?.(e.target.value)}
        cities={cities}
        loading={loadingCities}
        disabled={!regionId}
        placeholder={!regionId
          ? (showLabels ? 'Select' : `Select ${labels.region.toLowerCase()} first`)
          : (cityPlaceholder || (showLabels ? 'Select' : `Select ${labels.city}`))}
        loadingPlaceholder={cityLoadingPlaceholder || (hasCustomCityLabel ? 'Loading…' : 'Loading districts…')}
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
