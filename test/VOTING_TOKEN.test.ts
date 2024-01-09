import { ethers } from "hardhat"
import { expect } from "chai"

const minterMetamask = "0x0E1DbabfeB875E76C3a365174bcc06ae7286Be31"

describe.only("VOTING_TOKEN", function () {
  const deploy = async () => {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, minterAccount, ...otherAccounts] = await ethers.getSigners()
    console.log("owner", owner.address);
    // const account_balance = await ethers.provider.getBalance(owner.address)
    // console.log("account_balance", account_balance.toString());
    // console.log("minterAccount", minterAccount.address);
    console.log("otherAccount", otherAccount.address);

    // Deploy TOKEN
    const B3trContract = await ethers.getContractFactory("TOKEN")
    const token = await B3trContract.deploy(minterAccount)
    await token.waitForDeployment()
    console.log("token", await token.getAddress());

    // Deploy VOTING_TOKEN
    const Vot3Contract = await ethers.getContractFactory("VOTING_TOKEN")
    const votingToken = await Vot3Contract.deploy(await token.getAddress())
    await votingToken.waitForDeployment()
    console.log("votingToken", await votingToken.getAddress());

    return { B3trContract, token, votingToken, owner, otherAccount, minterAccount, otherAccounts }
  }

  describe("Unlock TOKEN", function () {
    it.only("should burn VOTING_TOKEN and unlock TOKEN", async function () {
      const { token, votingToken, minterAccount, otherAccount, owner } = await deploy()
      const vot3Address = await votingToken.getAddress()
      let tx

      // Mint some TOKEN
      await expect(token.connect(minterAccount).mint(otherAccount, ethers.parseEther("1000"))).not.to.be.reverted

      // Approve VOTING_TOKEN to spend TOKEN on behalf of otherAccount. N.B. this is an important step and could be included in a multi clause transaction
      await expect(token.connect(otherAccount).approve(vot3Address, ethers.parseEther("9"))).not.to.be.reverted

      // Lock TOKEN to get VOTING_TOKEN
      tx = await votingToken.connect(otherAccount).stake(ethers.parseEther("9"))
      await tx.wait()
      console.log("tx blocknumber Lock TOKEN to get VOTING_TOKEN", tx.blockNumber);

      // Delegate votes
      tx = await votingToken.connect(otherAccount).delegate(otherAccount)
      await tx.wait()

      // Check balances
      console.log("token", await token.balanceOf(otherAccount));
      console.log("votingToken", await votingToken.balanceOf(otherAccount));
      console.log("votes", await votingToken.getVotes(otherAccount));

      // Simulate a transfer
      console.log("transfer");
      await votingToken.connect(owner).setCanTransfer(true)
      await votingToken.connect(otherAccount).transfer(owner, ethers.parseEther("1"))

      // Check balances
      console.log("token", await token.balanceOf(otherAccount));
      console.log("votingToken", await votingToken.balanceOf(otherAccount));
      console.log("votes", await votingToken.getVotes(otherAccount));

      // Wait 10 seconds, with this hack everything works fine
      // await new Promise(resolve => setTimeout(resolve, 10000))

      // Unlock TOKEN to burn VOTING_TOKEN
      console.log("blockNumber before Unlock TOKEN to burn VOTING_TOKEN", await ethers.provider.getBlockNumber());
      tx = await votingToken.connect(otherAccount).unstake(ethers.parseEther("8"))
      const response = await tx.wait()
      console.log("tx blocknumber Unlock TOKEN to burn VOTING_TOKEN", tx.blockNumber);
      // console.log(response);
      const events = response?.logs
      // console.log(events);

      // Check balances
      console.log("token", await token.balanceOf(otherAccount));
      console.log("votingToken", await votingToken.balanceOf(otherAccount));
      console.log("votes", await votingToken.getVotes(otherAccount));
    }).timeout(10000000000000)
  })
})