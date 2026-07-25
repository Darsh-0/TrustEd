import { Contract, JsonRpcProvider, getAddress, hexlify, isAddress } from "ethers";

/// The read-only slice of the DAO's UniversityRegistry. Accreditation is decided by
/// ministry votes inside the DAO; everything downstream only ever reads the result.
const REGISTRY_ABI = [
    "function getUniversity(address university) view returns (tuple(string name, string country, string keyType, bytes publicKey, uint8 status, uint256 lastUpdated))",
    "function isAccredited(address university) view returns (bool)",
    "function publicKeyOf(address university) view returns (bytes)",
    "function applicantCount() view returns (uint256)",
    "function applicantAt(uint256 index) view returns (address)",
];

/// Mirrors UniversityRegistry.Status in the DAO contract.
const STATUS = ["None", "Pending", "Accredited", "Revoked"] as const;
type Status = (typeof STATUS)[number];

export type University = {
    address: string;
    name: string;
    country: string;
    keyType: string;
    publicKey: string;
    status: Status;
    accredited: boolean;
    lastUpdated: string;
};

export class RegistryNotConfigured extends Error {
    constructor() {
        super("UNIVERSITY_REGISTRY_ADDRESS is not set — point it at the DAO's UniversityRegistry");
    }
}

let cached: Contract | null = null;

/// Env is read lazily so dotenv.config() in index.ts wins regardless of import order.
export function registryConfig() {
    return {
        rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
        registryAddress: process.env.UNIVERSITY_REGISTRY_ADDRESS ?? null,
    };
}

function registry(): Contract {
    const { rpcUrl, registryAddress } = registryConfig();
    if (!registryAddress || !isAddress(registryAddress)) throw new RegistryNotConfigured();
    if (!cached) {
        cached = new Contract(registryAddress, REGISTRY_ABI, new JsonRpcProvider(rpcUrl));
    }
    return cached;
}

function toUniversity(address: string, raw: any): University {
    const status = STATUS[Number(raw.status)] ?? "None";
    return {
        address: getAddress(address),
        name: raw.name,
        country: raw.country,
        keyType: raw.keyType,
        publicKey: hexlify(raw.publicKey),
        status,
        accredited: status === "Accredited",
        lastUpdated: new Date(Number(raw.lastUpdated) * 1000).toISOString(),
    };
}

/// Every address the registry has ever seen, accredited or not — only used to derive
/// the accredited set below. Pending applications are the DAO's business, not ours.
async function allApplicants(contract: Contract): Promise<string[]> {
    const count = Number(await contract.applicantCount!());
    const indices = Array.from({ length: count }, (_, i) => i);
    return Promise.all(indices.map((i) => contract.applicantAt!(i) as Promise<string>));
}

/// The public directory: institutions the DAO has voted into accreditation.
export async function listAccredited(): Promise<University[]> {
    const contract = registry();
    const addresses = await allApplicants(contract);
    const records = await Promise.all(
        addresses.map(async (addr) => toUniversity(addr, await contract.getUniversity!(addr))),
    );
    return records.filter((u) => u.accredited);
}

export async function getUniversity(address: string): Promise<University> {
    return toUniversity(address, await registry().getUniversity!(address));
}

export async function isAccredited(address: string): Promise<boolean> {
    return registry().isAccredited!(address) as Promise<boolean>;
}
