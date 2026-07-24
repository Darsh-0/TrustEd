import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import IssuerRegistryABI from '../abi/IssuerRegistry.json';

export function useEducator(provider, account) {
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkEducator = async () => {
      if (!provider || !account) {
        setIsEducator(false);
        return;
      }

      const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS;
      if (!registryAddress || registryAddress === '0x0000000000000000000000000000000000000000') {
        setError('Registry address not configured');
        setIsEducator(false);
        return;
      }

      setLoading(true);
      try {
        const contract = new Contract(registryAddress, IssuerRegistryABI, provider);
        const result = await contract.isEducator(account);
        setIsEducator(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        setIsEducator(false);
      } finally {
        setLoading(false);
      }
    };

    checkEducator();
  }, [provider, account]);

  return { isEducator, loading, error };
}
