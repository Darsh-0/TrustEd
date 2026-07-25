/**
 * Headless smoke test: drives the SAME ABIs and call patterns the UI uses,
 * against a live anvil with the DAO deployed. Run with the chain up:
 *
 *   npm run smoke
 *
 * Leaves the chain populated (one accredited university, one active proposal)
 * so the playground has something to show on first load.
 */
import {
  createPublicClient,
  createWalletClient,
  createTestClient,
  http,
  encodeFunctionData,
  decodeEventLog,
  keccak256,
  stringToHex,
  type Abi,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil } from 'viem/chains'
import {
  DEFAULT_ADDRESSES as A,
  DEFAULT_RPC,
  registryAbi,
  membershipAbi,
  governorAbi,
  timelockAbi,
  allEventsAbi,
} from '../src/lib/contracts'
import { ACCOUNTS, SAMPLE_KEYS } from '../src/lib/accounts'
import { feedSummary } from '../src/lib/format'

const pub = createPublicClient({ chain: anvil, transport: http(DEFAULT_RPC) })
const test = createTestClient({ mode: 'anvil', chain: anvil, transport: http(DEFAULT_RPC) })

let failures = 0
function check(cond: boolean, label: string) {
  console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${label}`)
  if (!cond) failures++
}

async function writeAs(
  accountIndex: number,
  address: Address,
  abi: Abi,
  functionName: string,
  args: unknown[],
) {
  const account = privateKeyToAccount(ACCOUNTS[accountIndex].pk)
  const { request } = await pub.simulateContract({
    account,
    address,
    abi,
    functionName,
    args,
  } as never)
  const wallet = createWalletClient({ account, chain: anvil, transport: http(DEFAULT_RPC) })
  const hash = await wallet.writeContract(request as never)
  return pub.waitForTransactionReceipt({ hash })
}

const read = <T>(address: Address, abi: Abi, functionName: string, args: unknown[] = []) =>
  pub.readContract({ address, abi, functionName, args } as never) as Promise<T>

async function main() {
  console.log('— connection & deployment')
  const code = await pub.getCode({ address: A.governor })
  check(!!code && code !== '0x', 'governor bytecode found at default address')

  const uni = ACCOUNTS[6] // role-played university
  const key = SAMPLE_KEYS[0]

  console.log('— university applies (permissionless, own address)')
  await writeAs(6, A.registry, registryAbi as Abi, 'submitApplication', [
    'University of Canterbury',
    'NZ',
    'ed25519',
    key,
  ])
  const u1 = await read<{ name: string; status: number; publicKey: Hex }>(
    A.registry,
    registryAbi as Abi,
    'getUniversity',
    [uni.address],
  )
  check(u1.name === 'University of Canterbury', 'struct read decodes (name)')
  check(Number(u1.status) === 1, 'status is Pending')

  console.log('— ministry proposes accreditation')
  const calldata = encodeFunctionData({
    abi: registryAbi,
    functionName: 'accredit',
    args: [uni.address],
  })
  const description = 'Accredit University of Canterbury (smoke)'
  const rcpt = await writeAs(1, A.governor, governorAbi as Abi, 'propose', [
    [A.registry],
    [0n],
    [calldata],
    description,
  ])
  let proposalId = 0n
  for (const log of rcpt.logs) {
    try {
      const d = decodeEventLog({ abi: allEventsAbi, data: log.data, topics: log.topics })
      if (d.eventName === 'ProposalCreated') proposalId = (d.args as any).proposalId as bigint
    } catch {}
  }
  check(proposalId !== 0n, 'ProposalCreated decodes from receipt (union ABI)')

  console.log('— three ministries vote For')
  await test.mine({ blocks: 1 })
  for (const i of [1, 2, 3]) {
    await writeAs(i, A.governor, governorAbi as Abi, 'castVote', [proposalId, 1])
  }
  const votes = await read<[bigint, bigint, bigint]>(A.governor, governorAbi as Abi, 'proposalVotes', [proposalId])
  check(votes[1] === 3n, `forVotes == 3 (got ${votes})`)

  console.log('— voting period closes, queue, timelock matures, execute')
  const period = await read<bigint>(A.governor, governorAbi as Abi, 'votingPeriod')
  await test.mine({ blocks: Number(period) + 1 })
  const st = await read<number>(A.governor, governorAbi as Abi, 'state', [proposalId])
  check(Number(st) === 4, `state is Succeeded (got ${st})`)

  const dh = keccak256(stringToHex(description))
  await writeAs(1, A.governor, governorAbi as Abi, 'queue', [[A.registry], [0n], [calldata], dh])
  const minDelay = await read<bigint>(A.timelock, timelockAbi as Abi, 'getMinDelay')
  await test.increaseTime({ seconds: Number(minDelay) + 1 })
  await test.mine({ blocks: 1 })
  await writeAs(1, A.governor, governorAbi as Abi, 'execute', [[A.registry], [0n], [calldata], dh])

  const accredited = await read<boolean>(A.registry, registryAbi as Abi, 'isAccredited', [uni.address])
  const liveKey = await read<Hex>(A.registry, registryAbi as Abi, 'publicKeyOf', [uni.address])
  check(accredited, 'isAccredited == true after execution')
  check(liveKey === key, 'publicKeyOf returns the self-published key')

  console.log('— key rotation stays inert until approved')
  await writeAs(6, A.registry, registryAbi as Abi, 'requestKeyRotation', ['ed25519', SAMPLE_KEYS[1]])
  const pending = await read<[string, Hex]>(A.registry, registryAbi as Abi, 'pendingKeyOf', [uni.address])
  const liveKey2 = await read<Hex>(A.registry, registryAbi as Abi, 'publicKeyOf', [uni.address])
  check(pending[1] === SAMPLE_KEYS[1], 'rotation staged in pendingKeyOf')
  check(liveKey2 === key, 'live key unchanged by the request')

  console.log('— direct bypass reverts (the security model)')
  let bypassRejected = false
  try {
    await writeAs(1, A.registry, registryAbi as Abi, 'accredit', [uni.address])
  } catch (e) {
    bypassRejected = String(e).includes('OwnableUnauthorizedAccount')
  }
  check(bypassRejected, 'direct registry.accredit() reverts with OwnableUnauthorizedAccount')

  console.log('— resolution vote: one vote settles the application (TU Munich, account #7)')
  const muni = ACCOUNTS[7]
  const applyMunich = () =>
    writeAs(7, A.registry, registryAbi as Abi, 'submitApplication', [
      'Technical University of Munich',
      'DE',
      'ed25519',
      SAMPLE_KEYS[2],
    ])
  const openResolution = async (byMinistry: number) => {
    const r = await writeAs(byMinistry, A.governor, governorAbi as Abi, 'proposeAccreditation', [
      muni.address,
    ])
    let id = 0n
    let desc = ''
    for (const log of r.logs) {
      try {
        const d = decodeEventLog({ abi: allEventsAbi, data: log.data, topics: log.topics })
        if (d.eventName === 'ProposalCreated') {
          id = (d.args as any).proposalId as bigint
          desc = (d.args as any).description as string
        }
      } catch {}
    }
    return { id, desc }
  }
  const resolveCalldata = encodeFunctionData({
    abi: registryAbi,
    functionName: 'resolveApplication',
    args: [muni.address],
  })
  const executeResolution = async (desc: string) => {
    const dh = keccak256(stringToHex(desc))
    await writeAs(1, A.governor, governorAbi as Abi, 'queue', [[A.registry], [0n], [resolveCalldata], dh])
    await test.increaseTime({ seconds: Number(minDelay) + 1 })
    await test.mine({ blocks: 1 })
    await writeAs(1, A.governor, governorAbi as Abi, 'execute', [[A.registry], [0n], [resolveCalldata], dh])
  }

  await applyMunich()
  const res1 = await openResolution(1)
  check(res1.id !== 0n && res1.desc.includes('Resolve accreditation'), 'resolution vote opened')
  check(
    await read<boolean>(A.governor, governorAbi as Abi, 'isResolutionProposal', [res1.id]),
    'proposal flagged as resolution',
  )

  await test.mine({ blocks: 1 })
  await writeAs(1, A.governor, governorAbi as Abi, 'castVote', [res1.id, 1]) // one lone For
  await test.mine({ blocks: Number(period) + 1 })
  check(
    Number(await read<number>(A.governor, governorAbi as Abi, 'state', [res1.id])) === 4,
    'below-quorum resolution is still executable (Succeeded), never stuck',
  )
  await executeResolution(res1.desc)
  const rejected = await read<{ status: number }>(A.registry, registryAbi as Abi, 'getUniversity', [
    muni.address,
  ])
  check(Number(rejected.status) === 0, 'quorum-unmet vote AUTO-REJECTED the application')

  await applyMunich() // rejection frees the university to re-apply
  const res2 = await openResolution(2)
  await test.mine({ blocks: 1 })
  for (const i of [1, 2, 3]) {
    await writeAs(i, A.governor, governorAbi as Abi, 'castVote', [res2.id, 1])
  }
  await test.mine({ blocks: Number(period) + 1 })
  await executeResolution(res2.desc)
  check(
    await read<boolean>(A.registry, registryAbi as Abi, 'isAccredited', [muni.address]),
    're-applied, passing resolution ACCREDITED Munich',
  )

  console.log('— leave an Active proposal for the UI (approve rotation)')
  const rotCalldata = encodeFunctionData({
    abi: registryAbi,
    functionName: 'approveKeyRotation',
    args: [uni.address],
  })
  await writeAs(1, A.governor, governorAbi as Abi, 'propose', [
    [A.registry],
    [0n],
    [rotCalldata],
    'Approve key rotation for University of Canterbury',
  ])
  await test.mine({ blocks: 1 })

  console.log('— the feed pipeline decodes every event type it will see')
  const logs = await pub.getLogs({
    address: [A.governor, A.registry, A.membership, A.timelock],
    fromBlock: 0n,
    toBlock: 'latest',
  })
  const seen = new Map<string, number>()
  const ctx = { nameOf: (a: Address) => a.slice(0, 8), roleName: (h: Hex) => h.slice(0, 8) }
  let summaries = 0
  for (const log of logs) {
    try {
      const d = decodeEventLog({ abi: allEventsAbi, data: log.data, topics: log.topics })
      seen.set(d.eventName as string, (seen.get(d.eventName as string) ?? 0) + 1)
      if (feedSummary(d.eventName as string, (d.args ?? {}) as never, ctx)) summaries++
    } catch {}
  }
  const expected = [
    'RoleGranted',
    'MinistryInvited',
    'Transfer',
    'DelegateChanged',
    'DelegateVotesChanged',
    'ApplicationSubmitted',
    'ProposalCreated',
    'VoteCast',
    'ProposalQueued',
    'CallScheduled',
    'CallExecuted',
    'ProposalExecuted',
    'Accredited',
    'KeyRotationRequested',
    'AccreditationVoteOpened',
    'ApplicationResolved',
    'ApplicationRejected',
  ]
  for (const ev of expected) check((seen.get(ev) ?? 0) > 0, `decoded ${ev} × ${seen.get(ev) ?? 0}`)
  check(summaries > 0, `${summaries} human summaries rendered without throwing`)

  console.log(failures === 0 ? '\nSMOKE PASSED' : `\nSMOKE FAILED — ${failures} check(s)`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('SMOKE CRASHED:', e)
  process.exit(1)
})
