import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { BrowserProvider, Contract, isAddress, ZeroAddress } from 'ethers'
import IssuerRegistryABI from '../abi/IssuerRegistry.json'

const REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS
const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_REGISTRY_CHAIN_ID ?? 31337)

function parseError(err) {
  return err?.shortMessage ?? err?.reason ?? err?.info?.error?.message ?? err?.message ?? 'Unknown error'
}

function formatJoinDate(joinDate) {
  if (!joinDate || joinDate === 0n) return null
  return new Date(Number(joinDate) * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function useRegistry(wallet) {
  const { address, chainId, isConnected } = wallet

  const [educators, setEducators] = useState([])
  const [owner, setOwner] = useState(null)
  const [isEducator, setIsEducator] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [txPending, setTxPending] = useState(false)

  const cancelledRef = useRef(0)

  const notConfigured = !REGISTRY_ADDRESS || REGISTRY_ADDRESS === ZeroAddress
  const wrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID

  const readContract = useMemo(() => {
    if (notConfigured || wrongNetwork || !window.ethereum) return null
    const provider = new BrowserProvider(window.ethereum)
    return new Contract(REGISTRY_ADDRESS, IssuerRegistryABI, provider)
  }, [notConfigured, wrongNetwork])

  const writeContract = useCallback(async () => {
    if (notConfigured || wrongNetwork || !window.ethereum) return null
    const provider = new BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    return new Contract(REGISTRY_ADDRESS, IssuerRegistryABI, signer)
  }, [notConfigured, wrongNetwork])

  const refresh = useCallback(async () => {
    if (!readContract || !isConnected) {
      setEducators([])
      setOwner(null)
      setIsEducator(false)
      return
    }

    const id = ++cancelledRef.current
    setLoading(true)
    setError(null)

    try {
      const [ownerAddr, allAddresses, eduStatus] = await Promise.all([
        readContract.owner(),
        readContract.getAllEducators(),
        address ? readContract.isEducator(address) : Promise.resolve(false),
      ])

      if (cancelledRef.current !== id) return

      const details = await Promise.all(
        allAddresses.map(async (addr) => {
          const [, joinDate, name] = await readContract.getEducator(addr)
          return { address: addr, name, joinDate: formatJoinDate(joinDate) }
        })
      )

      if (cancelledRef.current !== id) return

      setOwner(ownerAddr)
      setEducators(details)
      setIsEducator(eduStatus)
    } catch (err) {
      if (cancelledRef.current !== id) return
      setError(parseError(err))
      setEducators([])
      setOwner(null)
      setIsEducator(false)
    } finally {
      if (cancelledRef.current === id) setLoading(false)
    }
  }, [readContract, address, isConnected])

  useEffect(() => {
    if (!isConnected || !readContract) return

    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const code = await readContract.runner.provider.getCode(REGISTRY_ADDRESS)
        if (code === '0x') {
          throw new Error('No contract found at the configured address')
        }

        const [ownerAddr, allAddresses, eduStatus] = await Promise.all([
          readContract.owner(),
          readContract.getAllEducators(),
          address ? readContract.isEducator(address) : Promise.resolve(false),
        ])

        if (cancelled) return

        const details = await Promise.all(
          allAddresses.map(async (addr) => {
            const [, joinDate, name] = await readContract.getEducator(addr)
            return { address: addr, name, joinDate: formatJoinDate(joinDate) }
          })
        )

        if (cancelled) return

        setOwner(ownerAddr)
        setEducators(details)
        setIsEducator(eduStatus)
      } catch (err) {
        if (cancelled) return
        setError(parseError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [readContract, address, isConnected])

  const isOwner = useMemo(() => {
    if (!owner || !address) return false
    return owner.toLowerCase() === address.toLowerCase()
  }, [owner, address])

  const count = educators.length

  const addEducator = useCallback(async (walletAddr, name) => {
    if (!isAddress(walletAddr)) throw new Error('Invalid address')
    if (walletAddr === ZeroAddress) throw new Error('Cannot register zero address')
    if (!name?.trim()) throw new Error('Name is required')

    const contract = await writeContract()
    if (!contract) throw new Error('Contract not available')

    setTxPending(true)
    try {
      const tx = await contract.addEducator(walletAddr, name.trim())
      await tx.wait()
      await refresh()
    } catch (err) {
      throw new Error(parseError(err), { cause: err })
    } finally {
      setTxPending(false)
    }
  }, [writeContract, refresh])

  const removeEducator = useCallback(async (walletAddr) => {
    const contract = await writeContract()
    if (!contract) throw new Error('Contract not available')

    setTxPending(true)
    try {
      const tx = await contract.removeEducator(walletAddr)
      await tx.wait()
      await refresh()
    } catch (err) {
      throw new Error(parseError(err), { cause: err })
    } finally {
      setTxPending(false)
    }
  }, [writeContract, refresh])

  return {
    educators,
    count,
    owner,
    isEducator,
    isOwner,
    loading,
    error,
    txPending,
    notConfigured,
    wrongNetwork,
    addEducator,
    removeEducator,
    refresh,
  }
}
