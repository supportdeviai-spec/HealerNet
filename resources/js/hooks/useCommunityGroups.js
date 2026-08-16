import { useCallback, useEffect, useState } from 'react';
import { locationApi } from '../services/locationApi';

export function useCommunityGroups(cityId) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async () => {
    if (!cityId) {
      setGroups([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await locationApi.getCommunityGroups(cityId);
      setGroups(res.data || []);
    } catch (e) {
      setError(e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}
