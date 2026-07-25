import { decodeFunctionData, type Address, type Hex } from 'viem'
import { governorAbi, membershipAbi, registryAbi, VOTE_SUPPORT } from './contracts'

export function shortAddr(a: string): string {
  return a.slice(0, 6) + '…' + a.slice(-4)
}

export function shortHash(h: string): string {
  return h.slice(0, 10) + '…'
}

export function shortHex(h: string, keep = 18): string {
  if (h.length <= keep * 2 + 3) return h
  return h.slice(0, keep) + '…' + h.slice(-6)
}

export function chainTime(ts: bigint): string {
  if (ts === 0n) return '—'
  return new Date(Number(ts) * 1000).toLocaleTimeString()
}

export function chainDate(ts: bigint): string {
  if (ts === 0n) return '—'
  return new Date(Number(ts) * 1000).toLocaleString()
}

export function plural(n: number | bigint, word: string): string {
  const v = typeof n === 'bigint' ? n : BigInt(n)
  return `${v} ${word}${v === 1n ? '' : 's'}`
}

/** Pretty-print a decoded arg for feed/calldata display. */
export function fmtArg(v: unknown): string {
  if (typeof v === 'bigint') return v.toString()
  if (typeof v === 'string') {
    if (v.startsWith('0x') && v.length === 42) return shortAddr(v)
    if (v.startsWith('0x') && v.length > 24) return shortHex(v, 10)
    return v.length > 42 ? `"${v.slice(0, 40)}…"` : `"${v}"`
  }
  if (Array.isArray(v)) return '[' + v.map(fmtArg).join(', ') + ']'
  return String(v)
}

const CALL_TARGET_ABIS = [
  { abi: registryAbi, label: 'UniversityRegistry' },
  { abi: membershipAbi, label: 'MinistryMembership' },
  { abi: governorAbi, label: 'AccreditationGovernor' },
]

/** Decode proposal calldata into `Contract.function(args…)` for humans. */
export function describeCall(calldata: Hex): string {
  for (const { abi, label } of CALL_TARGET_ABIS) {
    try {
      const { functionName, args } = decodeFunctionData({ abi, data: calldata })
      const rendered = (args ?? []).map(fmtArg).join(', ')
      return `${label}.${functionName}(${rendered})`
    } catch {
      /* try next abi */
    }
  }
  return `raw calldata ${shortHex(calldata, 10)}`
}

export function voteLabel(support: number): string {
  return VOTE_SUPPORT[support] ?? `support=${support}`
}

// ---------------------------------------------------------------------------
// Status → visual role (colors defined in app.css, validated dark palette)
// ---------------------------------------------------------------------------

/** University Status enum index → css modifier. */
export const UNI_STATUS_CLASS = ['muted', 'warning', 'good', 'critical'] as const

/** Governor ProposalState index → css modifier. */
export const PROPOSAL_STATE_CLASS = [
  'muted', // Pending
  'info', // Active
  'muted', // Canceled
  'critical', // Defeated
  'good-outline', // Succeeded
  'serious', // Queued
  'muted', // Expired
  'good', // Executed
] as const

export interface FeedSummaryCtx {
  nameOf: (addr: Address) => string
  roleName: (hash: Hex) => string
}

/** One human sentence per event type — the heart of "what is happening". */
export function feedSummary(
  event: string,
  args: Record<string, unknown>,
  ctx: FeedSummaryCtx,
): string {
  const a = args as Record<string, any>
  const who = (k: string) => ctx.nameOf(a[k] as Address)
  switch (event) {
    case 'ApplicationSubmitted':
      return `${a.name} (${a.country}) applied with a ${a.keyType} key, from its own address ${shortAddr(a.university)}`
    case 'Accredited':
      return `${who('university')} is now ACCREDITED — its key is live for verifiers`
    case 'Discredited':
      return `${who('university')} was discredited — "${a.reason}"`
    case 'ApplicationRejected':
      return `application from ${who('university')} was rejected`
    case 'KeyRotationRequested':
      return `${who('university')} staged a new ${a.keyType} key (live key untouched until the DAO approves)`
    case 'KeyRotationApproved':
      return `the DAO approved ${who('university')}'s key rotation — new key is live`
    case 'AccreditationVoteOpened':
      return `accreditation vote opened for ${who('university')} — For accredits, anything else auto-rejects; one vote settles it`
    case 'ApplicationResolved':
      return a.accredited
        ? `vote passed: ${who('university')} ACCREDITED (For ${a.forVotes} / Against ${a.againstVotes} / Abstain ${a.abstainVotes})`
        : `vote failed: ${who('university')} auto-rejected (For ${a.forVotes} / Against ${a.againstVotes} / Abstain ${a.abstainVotes})`
    case 'MinistryInvited':
      return `${a.name} joined the DAO (membership token #${a.tokenId})`
    case 'MinistryRevoked':
      return `${who('ministry')} was removed from the DAO (token #${a.tokenId} burned)`
    case 'Transfer':
      if (a.from === '0x0000000000000000000000000000000000000000')
        return `membership NFT #${a.tokenId} minted to ${who('to')} (soulbound)`
      if (a.to === '0x0000000000000000000000000000000000000000')
        return `membership NFT #${a.tokenId} burned from ${who('from')}`
      return `membership NFT #${a.tokenId} transferred (should be impossible!)`
    case 'DelegateChanged':
      return `${who('delegator')} auto-delegated votes to itself`
    case 'DelegateVotesChanged':
      return `voting power of ${who('delegate')}: ${a.previousVotes} → ${a.newVotes}`
    case 'ProposalCreated':
      return `${who('proposer')} proposed: "${String(a.description).slice(0, 80)}" — voting blocks ${a.voteStart}–${a.voteEnd}`
    case 'VoteCast':
      return `${who('voter')} voted ${voteLabel(Number(a.support))} (weight ${a.weight})`
    case 'ProposalQueued':
      return `proposal queued in the timelock — executable at ${chainTime(BigInt(a.etaSeconds))} chain time`
    case 'ProposalExecuted':
      return `proposal EXECUTED — the DAO's decision is now on-chain state`
    case 'ProposalCanceled':
      return `proposal canceled`
    case 'QuorumUpdated':
      return `quorum changed to ${a.newQuorum} members`
    case 'CallScheduled':
      return `timelock scheduled call → ${ctx.nameOf(a.target as Address)} (delay ${a.delay}s)`
    case 'CallExecuted':
      return `timelock executed call → ${ctx.nameOf(a.target as Address)}`
    case 'RoleGranted':
      return `${ctx.roleName(a.role as Hex)} granted to ${who('account')}`
    case 'RoleRevoked':
      return `${ctx.roleName(a.role as Hex)} revoked from ${who('account')}`
    default:
      return event
  }
}
