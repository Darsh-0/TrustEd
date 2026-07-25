/** Dump live governance state: every proposal, votes, deadlines, university statuses. */
import { createPublicClient, http, decodeEventLog, type Abi, type Address, type Hex } from 'viem'
import { anvil } from 'viem/chains'
import {
  DEFAULT_ADDRESSES as A,
  DEFAULT_RPC,
  registryAbi,
  governorAbi,
  allEventsAbi,
  PROPOSAL_STATE,
  UNI_STATUS,
} from '../src/lib/contracts'

const pub = createPublicClient({ chain: anvil, transport: http(DEFAULT_RPC) })
const read = <T>(address: Address, abi: Abi, fn: string, args: unknown[] = []) =>
  pub.readContract({ address, abi, functionName: fn, args } as never) as Promise<T>

const block = await pub.getBlockNumber()
const quorum = await read<bigint>(A.governor, governorAbi as Abi, 'quorum', [0n])
console.log(`current block ${block} · quorum ${quorum}\n`)

const logs = await pub.getLogs({
  address: [A.governor, A.registry],
  fromBlock: 0n,
  toBlock: 'latest',
})

const unis = new Set<Address>()
for (const log of logs) {
  try {
    const d = decodeEventLog({ abi: allEventsAbi, data: log.data, topics: log.topics })
    if (d.eventName === 'ProposalCreated') {
      const a = d.args as any
      const id = a.proposalId as bigint
      const [state, votes] = await Promise.all([
        read<number>(A.governor, governorAbi as Abi, 'state', [id]),
        read<[bigint, bigint, bigint]>(A.governor, governorAbi as Abi, 'proposalVotes', [id]),
      ])
      console.log(`PROPOSAL "${a.description}"`)
      console.log(`  created@block ${log.blockNumber} · voteStart ${a.voteStart} · voteEnd ${a.voteEnd} (deadline ${a.voteEnd < block ? 'PASSED' : 'not reached'})`)
      console.log(`  state: ${PROPOSAL_STATE[Number(state)]} · against=${votes[0]} for=${votes[1]} abstain=${votes[2]}`)
    }
    if (d.eventName === 'VoteCast') {
      const a = d.args as any
      console.log(`  vote@block ${log.blockNumber}: ${a.voter} support=${a.support} weight=${a.weight}`)
    }
    if (d.eventName === 'ApplicationSubmitted') unis.add((d.args as any).university as Address)
  } catch {}
}

console.log('')
for (const u of unis) {
  const info = await read<{ name: string; status: number }>(A.registry, registryAbi as Abi, 'getUniversity', [u])
  console.log(`UNIVERSITY ${info.name} (${u}): ${UNI_STATUS[Number(info.status)]}`)
}
