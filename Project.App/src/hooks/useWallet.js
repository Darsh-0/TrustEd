import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);

  const connect = async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);
      setAccount(accounts[0]);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  return { account, provider, error, connect, disconnect };
}
