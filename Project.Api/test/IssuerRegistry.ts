import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("IssuerRegistry", function () {
  it("Should set the deployer as owner", async function () {
    const [deployer] = await ethers.getSigners();
    const registry = await ethers.deployContract("IssuerRegistry");

    expect(await registry.owner()).to.equal(deployer.address);
  });

  it("Should add an educator", async function () {
    const [_, educator] = await ethers.getSigners();
    const registry = await ethers.deployContract("IssuerRegistry");

    await expect(registry.addEducator(educator.address, "Alice"))
      .to.emit(registry, "EducatorAdded")
      .withArgs(educator.address, "Alice");

    expect(await registry.isEducator(educator.address)).to.be.true;

    const [wallet, joinDate, name] = await registry.getEducator(educator.address);
    expect(wallet).to.equal(educator.address);
    expect(joinDate).to.be.greaterThan(0n);
    expect(name).to.equal("Alice");
  });

  it("Should reject duplicate educators", async function () {
    const [_, educator] = await ethers.getSigners();
    const registry = await ethers.deployContract("IssuerRegistry");

    await registry.addEducator(educator.address, "Alice");
    await expect(registry.addEducator(educator.address, "Alice Again"))
      .to.be.revertedWith("IssuerRegistry: already registered");
  });

  it("Should remove an educator", async function () {
    const [_, educator] = await ethers.getSigners();
    const registry = await ethers.deployContract("IssuerRegistry");

    await registry.addEducator(educator.address, "Alice");
    await expect(registry.removeEducator(educator.address))
      .to.emit(registry, "EducatorRemoved")
      .withArgs(educator.address);

    expect(await registry.isEducator(educator.address)).to.be.false;
    expect(await registry.educatorCount()).to.equal(0n);
  });

  it("Should reject unauthorized addEducator calls", async function () {
    const [_, other] = await ethers.getSigners();
    const registry = await ethers.deployContract("IssuerRegistry");

    await expect(registry.connect(other).addEducator(other.address, "Hacker"))
      .to.be.revertedWith("IssuerRegistry: caller is not the owner");
  });

  it("Should reject unauthorized removeEducator calls", async function () {
    const [_, educator, other] = await ethers.getSigners();
    const registry = await ethers.deployContract("IssuerRegistry");

    await registry.addEducator(educator.address, "Alice");
    await expect(registry.connect(other).removeEducator(educator.address))
      .to.be.revertedWith("IssuerRegistry: caller is not the owner");
  });

  it("Should return all educators", async function () {
    const [_, a, b, c] = await ethers.getSigners();
    const registry = await ethers.deployContract("IssuerRegistry");

    await registry.addEducator(a.address, "Alice");
    await registry.addEducator(b.address, "Bob");
    await registry.addEducator(c.address, "Carol");

    const all = await registry.getAllEducators();
    expect(all).to.have.length(3);
    expect(all).to.include(a.address);
    expect(all).to.include(b.address);
    expect(all).to.include(c.address);
  });

  it("Should transfer ownership", async function () {
    const [deployer, newOwner, educator] = await ethers.getSigners();
    const registry = await ethers.deployContract("IssuerRegistry");

    await expect(registry.transferOwnership(newOwner.address))
      .to.emit(registry, "OwnershipTransferred")
      .withArgs(deployer.address, newOwner.address);

    expect(await registry.owner()).to.equal(newOwner.address);

    await expect(registry.addEducator(educator.address, "Alice"))
      .to.be.revertedWith("IssuerRegistry: caller is not the owner");

    await registry.connect(newOwner).addEducator(educator.address, "Alice");
    expect(await registry.isEducator(educator.address)).to.be.true;
  });
});
