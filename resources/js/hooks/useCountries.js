import { useCallback, useEffect, useState } from 'react';
import { locationApi } from '../services/locationApi';

export function useCountries(search = '') {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCountries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await locationApi.getCountries(search);
      setCountries(res.data || []);
    } catch (e) {
      setError(e);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return { countries, loading, error, refetch: fetchCountries };
}
