import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider } from 'ethers'
import { WalletContext } from './wallet-context'

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

const DISCONNECT_KEY = 'degree:walletDisconnected'
const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_REGISTRY_CHAIN_ID ?? 31337)

export function WalletProvider({ children }) {
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
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        })
      } catch (err) {
        if (err.code === 4001) throw err
        await window.ethereum.request({ method: 'eth_requestAccounts', params: [] })
      }
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (!accounts || accounts.length === 0) throw new Error('No account returned.')
      const provider = new BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      setAddress(accounts[0])
      setChainId(Number(network.chainId))
      localStorage.removeItem(DISCONNECT_KEY)
      if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
          })
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                chainName: 'Local',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              }],
            })
          }
        }
      }
    } catch (err) {
      setError(err.code === 4001 ? 'Connection rejected.' : err.message)
    } finally {
      setIsConnecting(false)
    }
  }, [hasWallet])

  const disconnect = useCallback(async () => {
    localStorage.setItem(DISCONNECT_KEY, '1')
    try {
      await window.ethereum?.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      })
    } catch { /* wallet may not support revokePermissions */ }
    setAddress(null)
    setChainId(null)
    setError(null)
  }, [])

  const switchNetwork = useCallback(async (targetChainId) => {
    if (!hasWallet) return
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })
    } catch (err) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChainId.toString(16)}`,
              chainName: 'Hardhat',
              rpcUrls: ['http://127.0.0.1:8545'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            }],
          })
        } catch (addErr) {
          setError(addErr.message)
        }
      } else {
        setError(err.message)
      }
    }
  }, [hasWallet])

  useEffect(() => {
    if (!hasWallet) return

    if (localStorage.getItem(DISCONNECT_KEY) === '1') return

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then(async (accounts) => {
        if (accounts.length === 0) return
        if (localStorage.getItem(DISCONNECT_KEY) === '1') return
        const provider = new BrowserProvider(window.ethereum)
        const network = await provider.getNetwork()
        setAddress(accounts[0])
        setChainId(Number(network.chainId))
        if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
            })
          } catch (switchErr) {
            if (switchErr.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                  chainName: 'Local',
                  rpcUrls: ['http://127.0.0.1:8545'],
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                }],
              })
            }
          }
        }
      })
      .catch(() => {})

    const handleAccountsChanged = (accounts) => {
      if (localStorage.getItem(DISCONNECT_KEY) === '1') return
      if (accounts.length === 0) {
        setAddress(null)
        setChainId(null)
      } else {
        setAddress(accounts[0])
      }
    }

    const handleChainChanged = async (newChainIdHex) => {
      const newChainId = Number(newChainIdHex)
      setChainId(newChainId)
      if (newChainId !== EXPECTED_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
          })
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                chainName: 'Local',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              }],
            })
          }
        }
      }
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [hasWallet])

  const value = {
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
    switchNetwork,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
