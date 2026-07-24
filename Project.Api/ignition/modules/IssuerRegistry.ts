import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("IssuerRegistryModule", (m) => {
  const registry = m.contract("IssuerRegistry");

  return { registry };
});
