import {
  createPublicClient,
  createWalletClient,
  createTestClient,
  http,
  keccak256,
  stringToHex,
  encodeFunctionData,
  decodeEventLog,
  BaseError,
  ContractFunctionRevertedError,
  type Abi,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil } from 'viem/chains'
import {
  DEFAULT_ADDRESSES,
  DEFAULT_RPC,
  allEventsAbi,
  governorAbi,
  membershipAbi,
  registryAbi,
  timelockAbi,
  ROLE_NAMES,
  type ContractTag,
} from './contracts'
import { ACCOUNTS, type PlaygroundAccount } from './accounts'
import { describeCall, feedSummary, shortAddr } from './format'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UniversityRow {
  addr: Address
  name: string
  country: string
  keyType: string
  publicKey: Hex
  status: number // UNI_STATUS index
  lastUpdated: bigint
  pendingKeyType: string
  pendingKey: Hex | ''
}

export interface Member {
  addr: Address
  name: string
  votes: bigint
}

export interface ProposalRow {
  id: bigint
  proposer: Address
  targets: Address[]
  values: bigint[]
  calldatas: Hex[]
  description: string
  voteStart: bigint
  voteEnd: bigint
  state: number // PROPOSAL_STATE index
  against: bigint
  forVotes: bigint
  abstain: bigint
  eta: bigint
  hasVoted: boolean
  action: string // decoded human description of calldatas[0]
  isResolution: boolean // For = accredit, anything else = reject; always executable after deadline
}

export interface FeedItem {
  key: string
  block: bigint
  txHash: Hex
  contract: ContractTag
  event: string
  summary: string
}

export interface Toast {
  id: number
  kind: 'ok' | 'err' | 'info'
  text: string
}

// ---------------------------------------------------------------------------
// Reactive store (Svelte 5 runes in module scope)
// ---------------------------------------------------------------------------

export const S = $state({
  rpc: DEFAULT_RPC,
  addr: { ...DEFAULT_ADDRESSES },

  connected: false,
  deployed: false,
  checkedOnce: false,

  block: 0n,
  timestamp: 0n,

  quorum: 0n,
  memberCount: 0n,
  votingDelay: 0n,
  votingPeriod: 0n,
  minDelay: 0n,

  /** index into ACCOUNTS, or -1 for the read-only observer */
  roleIndex: 1,

  members: [] as Member[],
  universities: [] as UniversityRow[],
  proposals: [] as ProposalRow[],
  feed: [] as FeedItem[],

  pending: null as string | null,
  toasts: [] as Toast[],
})

export function role(): PlaygroundAccount | null {
  return S.roleIndex >= 0 ? ACCOUNTS[S.roleIndex] : null
}

export function isMemberRole(): boolean {
  const r = role()
  return !!r && S.members.some((m) => m.addr.toLowerCase() === r.address.toLowerCase())
}

export function universityOf(addr: Address | undefined): UniversityRow | undefined {
  if (!addr) return undefined
  return S.universities.find((u) => u.addr.toLowerCase() === addr.toLowerCase())
}

/** True if an unfinished proposal (Pending/Active/Succeeded/Queued) targets this address. */
export function hasOpenProposalTargeting(addr: Address): boolean {
  const needle = addr.slice(2).toLowerCase()
  return S.proposals.some(
    (p) => [0, 1, 4, 5].includes(p.state) && p.calldatas[0]?.toLowerCase().includes(needle),
  )
}

/** Best-known display name for any address (ministries, universities, contracts, accounts). */
export function nameOf(addr: Address): string {
  const lc = addr.toLowerCase()
  if (lc === S.addr.governor.toLowerCase()) return 'the Governor'
  if (lc === S.addr.timelock.toLowerCase()) return 'the Timelock'
  if (lc === S.addr.registry.toLowerCase()) return 'the Registry'
  if (lc === S.addr.membership.toLowerCase()) return 'the Membership token'
  const m = S.members.find((x) => x.addr.toLowerCase() === lc)
  if (m) return m.name
  const u = S.universities.find((x) => x.addr.toLowerCase() === lc)
  if (u) return u.name
  const a = ACCOUNTS.find((x) => x.address.toLowerCase() === lc)
  if (a) return `Account #${a.index} (${shortAddr(addr)})`
  return shortAddr(addr)
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

function chainFor() {
  return { ...anvil, rpcUrls: { default: { http: [S.rpc] } } }
}

function pub() {
  return createPublicClient({ chain: chainFor(), transport: http(S.rpc) })
}

function test() {
  return createTestClient({ mode: 'anvil', chain: chainFor(), transport: http(S.rpc) })
}

// Pragmatic typing: viem's deep generics fight hand-rolled unions; the ABIs are
// authoritative and every call site is exercised against the live contracts.
function read<T>(address: Address, abi: Abi, functionName: string, args: unknown[] = []): Promise<T> {
  return pub().readContract({ address, abi, functionName, args } as never) as Promise<T>
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

let toastSeq = 0
export function toast(kind: Toast['kind'], text: string) {
  const id = ++toastSeq
  S.toasts.push({ id, kind, text })
  setTimeout(() => {
    const i = S.toasts.findIndex((t) => t.id === id)
    if (i >= 0) S.toasts.splice(i, 1)
  }, 7000)
}

function errMsg(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as
      | ContractFunctionRevertedError
      | null
    if (revert?.data) {
      const args = (revert.data.args ?? []).map(String).join(', ')
      return `${revert.data.errorName}(${args})`
    }
    if (revert?.reason) return revert.reason
    return e.shortMessage
  }
  return e instanceof Error ? e.message : String(e)
}

// ---------------------------------------------------------------------------
// Refresh: rebuild the entire picture from logs + eth_calls
// ---------------------------------------------------------------------------

let refreshing = false

export async function refresh(): Promise<void> {
  if (refreshing) return
  refreshing = true
  try {
    const client = pub()

    let code: Hex | undefined
    try {
      code = await client.getCode({ address: S.addr.governor })
      S.connected = true
    } catch {
      S.connected = false
      S.deployed = false
      return
    }
    S.deployed = !!code && code !== '0x'
    if (!S.deployed) return

    const latest = await client.getBlock({ blockTag: 'latest' })
    S.block = latest.number
    S.timestamp = latest.timestamp

    const [quorum, memberCount, votingDelay, votingPeriod, minDelay, logs] = await Promise.all([
      read<bigint>(S.addr.governor, governorAbi as Abi, 'quorum', [0n]),
      read<bigint>(S.addr.membership, membershipAbi as Abi, 'memberCount'),
      read<bigint>(S.addr.governor, governorAbi as Abi, 'votingDelay'),
      read<bigint>(S.addr.governor, governorAbi as Abi, 'votingPeriod'),
      read<bigint>(S.addr.timelock, timelockAbi as Abi, 'getMinDelay'),
      client.getLogs({
        address: [S.addr.governor, S.addr.registry, S.addr.membership, S.addr.timelock],
        fromBlock: 0n,
        toBlock: 'latest',
      }),
    ])
    S.quorum = quorum
    S.memberCount = memberCount
    S.votingDelay = votingDelay
    S.votingPeriod = votingPeriod
    S.minDelay = minDelay

    // --- decode every log we understand -----------------------------------
    const tagOf = (a: Address): ContractTag => {
      const lc = a.toLowerCase()
      if (lc === S.addr.registry.toLowerCase()) return 'registry'
      if (lc === S.addr.membership.toLowerCase()) return 'membership'
      if (lc === S.addr.timelock.toLowerCase()) return 'timelock'
      return 'governor'
    }

    type Decoded = {
      tag: ContractTag
      event: string
      args: Record<string, unknown>
      block: bigint
      logIndex: number
      txHash: Hex
    }
    const decoded: Decoded[] = []
    for (const log of logs) {
      try {
        const d = decodeEventLog({ abi: allEventsAbi, data: log.data, topics: log.topics })
        decoded.push({
          tag: tagOf(log.address),
          event: d.eventName as string,
          args: (d.args ?? {}) as Record<string, unknown>,
          block: log.blockNumber ?? 0n,
          logIndex: log.logIndex ?? 0,
          txHash: log.transactionHash ?? '0x',
        })
      } catch {
        /* unknown event (e.g. internal) — skip */
      }
    }
    decoded.sort((a, b) =>
      a.block === b.block ? a.logIndex - b.logIndex : a.block < b.block ? -1 : 1,
    )

    // --- members ------------------------------------------------------------
    const ministryAddrs = [
      ...new Set(
        decoded
          .filter((d) => d.event === 'MinistryInvited')
          .map((d) => (d.args.ministry as Address).toLowerCase() as Address),
      ),
    ]
    const members: Member[] = []
    await Promise.all(
      ministryAddrs.map(async (addr) => {
        try {
          const [is, name, votes] = await Promise.all([
            read<boolean>(S.addr.membership, membershipAbi as Abi, 'isMember', [addr]),
            read<string>(S.addr.membership, membershipAbi as Abi, 'memberName', [addr]),
            read<bigint>(S.addr.membership, membershipAbi as Abi, 'getVotes', [addr]),
          ])
          if (is) members.push({ addr, name, votes })
        } catch (e) {
          console.warn('member read failed', addr, e)
        }
      }),
    )
    members.sort((a, b) => a.name.localeCompare(b.name))
    S.members = members

    // --- universities ---------------------------------------------------------
    const uniAddrs = [
      ...new Set(
        decoded
          .filter((d) => d.event === 'ApplicationSubmitted')
          .map((d) => (d.args.university as Address).toLowerCase() as Address),
      ),
    ]
    const universities: UniversityRow[] = []
    await Promise.all(
      uniAddrs.map(async (addr) => {
        try {
        const [u, pending] = await Promise.all([
          read<{
            name: string
            country: string
            keyType: string
            publicKey: Hex
            status: number
            lastUpdated: bigint
          }>(S.addr.registry, registryAbi as Abi, 'getUniversity', [addr]),
          read<[string, Hex]>(S.addr.registry, registryAbi as Abi, 'pendingKeyOf', [addr]),
        ])
        universities.push({
          addr,
          name: u.name,
          country: u.country,
          keyType: u.keyType,
          publicKey: u.publicKey,
          status: Number(u.status),
          lastUpdated: u.lastUpdated,
          pendingKeyType: pending[0],
          pendingKey: pending[1] === '0x' ? '' : pending[1],
        })
        } catch (e) {
          console.warn('university read failed', addr, e)
        }
      }),
    )
    universities.sort((a, b) => a.name.localeCompare(b.name))
    S.universities = universities

    // --- proposals ------------------------------------------------------------
    const created = decoded.filter((d) => d.event === 'ProposalCreated')
    const me = role()
    const proposals: ProposalRow[] = []
    await Promise.all(
      created.map(async (d) => {
        try {
        const a = d.args as Record<string, any>
        const id = a.proposalId as bigint
        const [state, votes, eta, voted, isResolution] = await Promise.all([
          read<number>(S.addr.governor, governorAbi as Abi, 'state', [id]),
          read<[bigint, bigint, bigint]>(S.addr.governor, governorAbi as Abi, 'proposalVotes', [id]),
          read<bigint>(S.addr.governor, governorAbi as Abi, 'proposalEta', [id]),
          me
            ? read<boolean>(S.addr.governor, governorAbi as Abi, 'hasVoted', [id, me.address])
            : Promise.resolve(false),
          read<boolean>(S.addr.governor, governorAbi as Abi, 'isResolutionProposal', [id]),
        ])
        proposals.push({
          id,
          proposer: a.proposer as Address,
          targets: [...(a.targets as Address[])],
          values: [...(a.values as bigint[])],
          calldatas: [...(a.calldatas as Hex[])],
          description: a.description as string,
          voteStart: a.voteStart as bigint,
          voteEnd: a.voteEnd as bigint,
          state: Number(state),
          against: votes[0],
          forVotes: votes[1],
          abstain: votes[2],
          eta,
          hasVoted: voted,
          action: describeCall((a.calldatas as Hex[])[0]),
          isResolution,
        })
        } catch (e) {
          console.warn('proposal read failed', e)
        }
      }),
    )
    proposals.sort((a, b) => (a.voteStart < b.voteStart ? 1 : -1))
    S.proposals = proposals

    // --- activity feed (names resolve against the fresh member/uni lists) -----
    const ctx = {
      nameOf,
      roleName: (h: Hex) => ROLE_NAMES[h] ?? 'role ' + h.slice(0, 10) + '…',
    }
    S.feed = decoded
      .slice(-250)
      .reverse()
      .map((d, i) => ({
        key: `${d.block}-${d.logIndex}-${i}`,
        block: d.block,
        txHash: d.txHash,
        contract: d.tag,
        event: d.event,
        summary: feedSummary(d.event, d.args, ctx),
      }))
  } finally {
    S.checkedOnce = true
    refreshing = false
  }
}

// ---------------------------------------------------------------------------
// Writes (simulate first for decoded reverts, then send, then refresh)
// ---------------------------------------------------------------------------

async function write(
  label: string,
  address: Address,
  abi: Abi,
  functionName: string,
  args: unknown[],
): Promise<boolean> {
  const acct = role()
  if (!acct) {
    toast('err', 'The observer holds no key — switch to an account to transact.')
    return false
  }
  if (S.pending) {
    toast('info', `Still waiting on "${S.pending}" — try again once it lands.`)
    return false
  }
  S.pending = label
  try {
    const account = privateKeyToAccount(acct.pk)
    const client = pub()
    const { request } = await client.simulateContract({
      account,
      address,
      abi,
      functionName,
      args,
    } as never)
    const wallet = createWalletClient({ account, chain: chainFor(), transport: http(S.rpc) })
    const hash = await wallet.writeContract(request as never)
    const rcpt = await client.waitForTransactionReceipt({ hash })
    if (rcpt.status === 'success') {
      toast('ok', `${label} — mined in block ${rcpt.blockNumber} (gas ${rcpt.gasUsed})`)
    } else {
      toast('err', `${label} — transaction reverted`)
    }
    return rcpt.status === 'success'
  } catch (e) {
    toast('err', `${label} — ${errMsg(e)}`)
    return false
  } finally {
    S.pending = null
    void refresh()
  }
}

async function proposeCall(target: Address, calldata: Hex, description: string) {
  // The block suffix keeps descriptions unique: identical description + calldata
  // hash to the SAME proposalId, so re-proposing after a defeat would revert.
  const unique = `${description} [block ${S.block}]`
  const ok = await write(
    `Propose "${description.slice(0, 48)}"`,
    S.addr.governor,
    governorAbi as Abi,
    'propose',
    [[target], [0n], [calldata], unique],
  )
  if (ok) {
    toast(
      'info',
      'Proposal created — proposing only OPENS the vote. Scroll to its card in Proposals: ministries vote there while it is Active, then queue and execute.',
    )
  }
  return ok
}

export const actions = {
  // -- as a university ------------------------------------------------------
  submitApplication(name: string, country: string, keyType: string, publicKey: Hex) {
    return write('Submit application', S.addr.registry, registryAbi as Abi, 'submitApplication', [
      name,
      country,
      keyType,
      publicKey,
    ])
  },
  requestKeyRotation(keyType: string, publicKey: Hex) {
    return write('Request key rotation', S.addr.registry, registryAbi as Abi, 'requestKeyRotation', [
      keyType,
      publicKey,
    ])
  },

  // -- as a ministry: proposals ----------------------------------------------
  /** One vote settles the application: For accredits; anything else (including
   *  silence) rejects. The governor builds the proposal and keeps it executable
   *  either way once voting closes. */
  async proposeResolution(u: UniversityRow) {
    const ok = await write(
      `Open accreditation vote for ${u.name}`,
      S.addr.governor,
      governorAbi as Abi,
      'proposeAccreditation',
      [u.addr],
    )
    if (ok) {
      toast(
        'info',
        'Vote opened — For accredits, Against rejects, and once the voting window closes the outcome executes either way. Find its card under Proposals.',
      )
    }
    return ok
  },
  proposeDiscredit(u: UniversityRow, reason: string) {
    return proposeCall(
      S.addr.registry,
      encodeFunctionData({ abi: registryAbi, functionName: 'discredit', args: [u.addr, reason] }),
      `Discredit ${u.name} (${u.addr}) — ${reason}`,
    )
  },
  proposeApproveRotation(u: UniversityRow) {
    return proposeCall(
      S.addr.registry,
      encodeFunctionData({ abi: registryAbi, functionName: 'approveKeyRotation', args: [u.addr] }),
      `Approve key rotation for ${u.name} (${u.addr})`,
    )
  },
  proposeInvite(addr: Address, name: string) {
    return proposeCall(
      S.addr.membership,
      encodeFunctionData({ abi: membershipAbi, functionName: 'inviteMinistry', args: [addr, name] }),
      `Invite ${name} (${addr}) to the DAO`,
    )
  },
  proposeDisinvite(m: Member) {
    return proposeCall(
      S.addr.membership,
      encodeFunctionData({ abi: membershipAbi, functionName: 'revokeMembership', args: [m.addr] }),
      `Remove ${m.name} (${m.addr}) from the DAO`,
    )
  },
  proposeSetQuorum(n: bigint) {
    return proposeCall(
      S.addr.governor,
      encodeFunctionData({ abi: governorAbi, functionName: 'setQuorum', args: [n] }),
      `Change quorum to ${n}`,
    )
  },

  // -- lifecycle --------------------------------------------------------------
  vote(p: ProposalRow, support: 0 | 1 | 2) {
    return write(
      `Vote ${['Against', 'For', 'Abstain'][support]}`,
      S.addr.governor,
      governorAbi as Abi,
      'castVote',
      [p.id, support],
    )
  },
  queue(p: ProposalRow) {
    return write('Queue proposal', S.addr.governor, governorAbi as Abi, 'queue', [
      p.targets,
      p.values,
      p.calldatas,
      keccak256(stringToHex(p.description)),
    ])
  },
  execute(p: ProposalRow) {
    return write('Execute proposal', S.addr.governor, governorAbi as Abi, 'execute', [
      p.targets,
      p.values,
      p.calldatas,
      keccak256(stringToHex(p.description)),
    ])
  },

  /** Re-run a defeated/expired proposal: same call, fresh unique description. */
  async repropose(p: ProposalRow) {
    const base = p.description.replace(/ \[block \d+\]$/, '')
    const unique = `${base} [block ${S.block}]`
    const ok = await write(
      `Re-propose "${base.slice(0, 40)}"`,
      S.addr.governor,
      governorAbi as Abi,
      'propose',
      [p.targets, p.values, p.calldatas, unique],
    )
    if (ok) toast('info', 'Proposal re-created — vote on the new card while it is Active.')
    return ok
  },

  // -- the educational failure ------------------------------------------------
  directAccredit(u: UniversityRow) {
    return write(
      'Bypass the DAO (direct accredit)',
      S.addr.registry,
      registryAbi as Abi,
      'accredit',
      [u.addr],
    )
  },

  // -- chain controls (anvil cheats) -------------------------------------------
  async mine(blocks: number) {
    try {
      await test().mine({ blocks })
      toast('info', `Mined ${blocks} block${blocks === 1 ? '' : 's'}`)
    } catch (e) {
      toast('err', `mine failed — ${errMsg(e)}`)
    }
    void refresh()
  },
  async warp(seconds: number) {
    try {
      await test().increaseTime({ seconds })
      await test().mine({ blocks: 1 })
      toast('info', `Chain time advanced ${seconds}s (and 1 block mined)`)
    } catch (e) {
      toast('err', `warp failed — ${errMsg(e)}`)
    }
    void refresh()
  },
}

// ---------------------------------------------------------------------------
// Settings persistence + polling
// ---------------------------------------------------------------------------

const LS_KEY = 'uad.playground.settings.v1'

export function saveSettings(rpc: string, addr: typeof S.addr) {
  S.rpc = rpc
  S.addr = { ...addr }
  localStorage.setItem(LS_KEY, JSON.stringify({ rpc, addr }))
  void refresh()
}

export function initChain(): () => void {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved.rpc) S.rpc = saved.rpc
      if (saved.addr?.governor) S.addr = { ...S.addr, ...saved.addr }
    }
  } catch {
    /* fresh start */
  }
  void refresh()
  const t = setInterval(() => void refresh(), 1600)
  return () => clearInterval(t)
}
