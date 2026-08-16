import { useCallback, useEffect, useState } from 'react';
import { locationApi } from '../services/locationApi';

export function useCities(regionId, search = '') {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCities = useCallback(async () => {
    if (!regionId) {
      setCities([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await locationApi.getCities(regionId, search);
      setCities(res.data || []);
    } catch (e) {
      setError(e);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }, [regionId, search]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  return { cities, loading, error, refetch: fetchCities };
}
