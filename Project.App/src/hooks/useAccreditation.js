import { useState, useEffect, useCallback, useMemo } from "react";
import UniversityRegistryABI from "../abi/UniversityRegistry.json";
import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  ZeroAddress,
} from "ethers";

const REGISTRY_ADDRESS = import.meta.env.VITE_UNIVERSITY_REGISTRY_ADDRESS;
const EXPECTED_CHAIN_ID = Number(
  import.meta.env.VITE_REGISTRY_CHAIN_ID ?? 31337,
);
const RPC_URL = import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545";

/// Mirrors UniversityRegistry.Status in the DAO contract.
const STATUS_ACCREDITED = 2;

// -----------------------------------------------------------------------------
// Cache
// -----------------------------------------------------------------------------

const CACHE_TTL = 300_000; // 5 mins

let registryCache = null;
let cacheTime = 0;
let pendingRequest = null;

function parseError(err) {
  return (
    err?.shortMessage ??
    err?.reason ??
    err?.info?.error?.message ??
    err?.message ??
    "Unknown error"
  );
}

function formatDate(timestamp) {
  if (!timestamp || timestamp === 0n) return null;
  return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/// Reads the DAO's UniversityRegistry. Accreditation is decided by ministry votes
/// inside the DAO — this app only consumes the outcome, it never writes to it.
export function useAccreditation(wallet) {
  const { address, chainId, isConnected } = wallet;

  const notConfigured = !REGISTRY_ADDRESS || REGISTRY_ADDRESS === ZeroAddress;
  const wrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  const [state, setState] = useState({
    universities: [],
    isAccredited: false,
    loading: !notConfigured,
    error: null,
  });

  // The directory is public data, so read it over plain RPC — no wallet required.
  // Fall back to the injected provider when no RPC URL is reachable.
  const contract = useMemo(() => {
    if (notConfigured) return null;

    const provider = RPC_URL
      ? new JsonRpcProvider(RPC_URL)
      : window.ethereum
        ? new BrowserProvider(window.ethereum)
        : null;

    if (!provider) return null;

    return new Contract(REGISTRY_ADDRESS, UniversityRegistryABI, provider);
  }, [notConfigured]);

  const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";

  const MULTICALL3_ABI = [
    "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[])",
  ];

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!contract) {
        return {
          universities: [],
          isAccredited: false,
        };
      }

      const now = Date.now();

      // Serve cached data.
      if (!forceRefresh && registryCache && now - cacheTime < CACHE_TTL) {
        return {
          universities: registryCache.universities,
          isAccredited: address
            ? registryCache.accreditedAddresses.has(address.toLowerCase())
            : false,
        };
      }

      // Reuse an in-flight request.
      if (!forceRefresh && pendingRequest) {
        const cache = await pendingRequest;

        return {
          universities: cache.universities,
          isAccredited: address
            ? cache.accreditedAddresses.has(address.toLowerCase())
            : false,
        };
      }

      pendingRequest = (async () => {
        const provider = contract.runner.provider;
        const iface = contract.interface;
        const multicall = new Contract(MULTICALL3, MULTICALL3_ABI, provider);

        const count = Number(await contract.applicantCount());

        if (count === 0) {
          const cache = {
            universities: [],
            accreditedAddresses: new Set(),
          };

          registryCache = cache;
          cacheTime = Date.now();

          return cache;
        }

        // Fetch applicant addresses in one multicall.
        const addrCalls = Array.from({ length: count }, (_, i) => ({
          target: REGISTRY_ADDRESS,
          allowFailure: false,
          callData: iface.encodeFunctionData("applicantAt", [i]),
        }));

        const addrResults = await multicall.aggregate3(addrCalls);

        const addresses = addrResults.map(
          (r) => iface.decodeFunctionResult("applicantAt", r.returnData)[0],
        );

        // Fetch all university records in one multicall.
        const uniCalls = addresses.map((addr) => ({
          target: REGISTRY_ADDRESS,
          allowFailure: false,
          callData: iface.encodeFunctionData("getUniversity", [addr]),
        }));

        const uniResults = await multicall.aggregate3(uniCalls);

        const accreditedAddresses = new Set();

        const universities = uniResults
          .map((r, i) => {
            const u = iface.decodeFunctionResult(
              "getUniversity",
              r.returnData,
            )[0];

            const accredited = Number(u.status) === STATUS_ACCREDITED;

            if (accredited) {
              accreditedAddresses.add(addresses[i].toLowerCase());
            }

            return {
              address: addresses[i],
              name: u.name,
              country: u.country,
              keyType: u.keyType,
              publicKey: u.publicKey,
              accredited,
              since: formatDate(u.lastUpdated),
            };
          })
          .filter((u) => u.accredited);

        const cache = {
          universities,
          accreditedAddresses,
        };

        registryCache = cache;
        cacheTime = Date.now();

        return cache;
      })();

      try {
        const cache = await pendingRequest;

        return {
          universities: cache.universities,
          isAccredited: address
            ? cache.accreditedAddresses.has(address.toLowerCase())
            : false,
        };
      } finally {
        pendingRequest = null;
      }
    },
    [contract, address],
  );

  useEffect(() => {
    if (!contract) return;

    let cancelled = false;

    load()
      .then((result) => {
        if (!cancelled) {
          setState({
            ...result,
            loading: false,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            universities: [],
            isAccredited: false,
            loading: false,
            error: parseError(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contract, load]);

  return {
    universities: state.universities,
    count: state.universities.length,
    isAccredited: state.isAccredited,
    loading: state.loading,
    error: state.error,
    notConfigured,
    wrongNetwork,

    // Optional: expose this if you want to manually refresh after a transaction.
    refresh: () => load(true),
  };
}
