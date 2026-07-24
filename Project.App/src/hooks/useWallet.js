import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider } from 'ethers'

const NETWORK_NAMES = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  137: 'Polygon',
  80002: 'Amoy',
  31337: 'Hardhat',
  1337: 'Local',
}

function getNetworkName(chainId) {
  return NETWORK_NAMES[chainId] ?? `Chain ${chainId}`
}

function truncateAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function useWallet() {
  const [address, setAddress] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)

  const hasWallet = typeof window !== 'undefined' && Boolean(window.ethereum)

  const connect = useCallback(async () => {
    if (!hasWallet) return
    setIsConnecting(true)
    setError(null)
    try {
      const provider = new BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const [addr, network] = await Promise.all([
        signer.getAddress(),
        provider.getNetwork(),
      ])
      setAddress(addr)
      setChainId(Number(network.chainId))
    } catch (err) {
      setError(err.code === 4001 ? 'Connection rejected.' : err.message)
    } finally {
      setIsConnecting(false)
    }
  }, [hasWallet])

  const disconnect = useCallback(() => {
    setAddress(null)
    setChainId(null)
    setError(null)
  }, [])

  useEffect(() => {
    if (!hasWallet) return

    // Silently check if already authorised (no prompt)
    window.ethereum
      .request({ method: 'eth_accounts' })
      .then(async (accounts) => {
        if (accounts.length === 0) return
        const provider = new BrowserProvider(window.ethereum)
        const network = await provider.getNetwork()
        setAddress(accounts[0])
        setChainId(Number(network.chainId))
      })
      .catch(() => {})

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAddress(null)
        setChainId(null)
      } else {
        setAddress(accounts[0])
      }
    }

    // Chain changes require a reload — provider state becomes stale otherwise
    const handleChainChanged = () => window.location.reload()

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [hasWallet])

  return {
    address,
    chainId,
    networkName: chainId ? getNetworkName(chainId) : null,
    truncatedAddress: address ? truncateAddress(address) : null,
    isConnecting,
    isConnected: Boolean(address),
    hasWallet,
    error,
    connect,
    disconnect,
  }
}
