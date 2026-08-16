import { useCallback, useEffect, useState } from 'react';
import { locationApi } from '../services/locationApi';

export function useRegions(countryId, search = '') {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRegions = useCallback(async () => {
    if (!countryId) {
      setRegions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await locationApi.getRegions(countryId, search);
      setRegions(res.data || []);
    } catch (e) {
      setError(e);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  }, [countryId, search]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  return { regions, loading, error, refetch: fetchRegions };
}
