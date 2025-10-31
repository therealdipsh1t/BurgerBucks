const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const BurgerPresale = await hre.ethers.getContractFactory("BurgerPresale");
  const presale = await BurgerPresale.deploy(process.env.USDC_ADDRESS);
  await presale.deployed();

  console.log(`BurgerPresale deployed to: ${presale.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});