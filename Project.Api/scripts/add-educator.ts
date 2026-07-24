import { network } from "hardhat";

const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS;
const EDUCATOR_ADDRESS = process.env.EDUCATOR_ADDRESS;
const EDUCATOR_NAME = process.env.EDUCATOR_NAME || "Educator";

if (!REGISTRY_ADDRESS || !EDUCATOR_ADDRESS) {
  console.error("Usage:");
  console.error('  REGISTRY_ADDRESS=0x... EDUCATOR_ADDRESS=0x... EDUCATOR_NAME="Name" npx hardhat run scripts/add-educator.ts --network hardhatMainnet');
  process.exit(1);
}

const { ethers } = await network.create();

const abi = [
  "function addEducator(address wallet, string name)",
  "function isEducator(address wallet) view returns (bool)",
];

const [signer] = await ethers.getSigners();
const registry = new ethers.Contract(REGISTRY_ADDRESS, abi, signer);

console.log(`Adding ${EDUCATOR_NAME} (${EDUCATOR_ADDRESS}) as educator...`);
const tx = await registry.addEducator(EDUCATOR_ADDRESS, EDUCATOR_NAME);
await tx.wait();
console.log("Done! Transaction:", tx.hash);

const isEducator = await registry.isEducator(EDUCATOR_ADDRESS);
console.log("Verified:", isEducator ? "is educator" : "NOT educator");
