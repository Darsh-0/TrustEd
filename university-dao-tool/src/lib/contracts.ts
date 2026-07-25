import { parseAbi, keccak256, stringToHex, type Address, type Hex } from 'viem'

/**
 * Reads a VITE_ variable from whichever environment we are in: Vite inlines
 * import.meta.env in the browser build, while scripts/ run under plain node.
 */
function env(key: string): string | undefined {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env
  // Reached via globalThis so this file needs no node types to typecheck.
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return viteEnv?.[key] || nodeEnv?.[key] || undefined
}

/**
 * Default addresses for a fresh anvil + `forge script script/Deploy.s.sol`:
 * the deployer's first four CREATE nonces are deterministic. Overridable via
 * .env (the repo's ./4-start-dao-tool.sh writes it from the deployment JSON),
 * and still editable in the settings panel at runtime.
 */
export const DEFAULT_ADDRESSES = {
  timelock: (env('VITE_TIMELOCK_ADDRESS') ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3') as Address,
  membership: (env('VITE_MEMBERSHIP_ADDRESS') ?? '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as Address,
  registry: (env('VITE_REGISTRY_ADDRESS') ?? '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as Address,
  governor: (env('VITE_GOVERNOR_ADDRESS') ?? '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9') as Address,
}

export const DEFAULT_RPC = env('VITE_RPC_URL') ?? 'http://127.0.0.1:8545'

// ---------------------------------------------------------------------------
// ABIs (human-readable, only what the playground uses)
// ---------------------------------------------------------------------------

export const registryAbi = parseAbi([
  'struct University { string name; string country; string keyType; bytes publicKey; uint8 status; uint256 lastUpdated }',
  // permissionless
  'function submitApplication(string name, string country, string keyType, bytes publicKey)',
  'function requestKeyRotation(string keyType, bytes publicKey)',
  // DAO-only (proposal targets; direct calls revert)
  'function accredit(address university)',
  'function discredit(address university, string reason)',
  'function rejectApplication(address university)',
  'function approveKeyRotation(address university)',
  'function resolveApplication(address university)',
  // reads
  'function getUniversity(address university) view returns (University u)',
  'function isAccredited(address university) view returns (bool)',
  'function publicKeyOf(address university) view returns (bytes)',
  'function pendingKeyOf(address university) view returns (string keyType, bytes publicKey)',
  'function applicantCount() view returns (uint256)',
  'function applicantAt(uint256 index) view returns (address)',
  'function owner() view returns (address)',
  // events
  'event ApplicationSubmitted(address indexed university, string name, string country, string keyType, bytes publicKey)',
  'event Accredited(address indexed university)',
  'event Discredited(address indexed university, string reason)',
  'event ApplicationRejected(address indexed university)',
  'event KeyRotationRequested(address indexed university, string keyType, bytes publicKey)',
  'event KeyRotationApproved(address indexed university, string keyType, bytes publicKey)',
  'event ApplicationResolved(address indexed university, bool accredited, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes)',
  // errors
  'error OwnableUnauthorizedAccount(address account)',
])

export const membershipAbi = parseAbi([
  'function inviteMinistry(address ministry, string ministryName) returns (uint256)',
  'function revokeMembership(address ministry)',
  'function isMember(address account) view returns (bool)',
  'function memberName(address account) view returns (string)',
  'function memberCount() view returns (uint256)',
  'function getVotes(address account) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function owner() view returns (address)',
  'event MinistryInvited(address indexed ministry, uint256 indexed tokenId, string name)',
  'event MinistryRevoked(address indexed ministry, uint256 indexed tokenId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)',
  'event DelegateVotesChanged(address indexed delegate, uint256 previousVotes, uint256 newVotes)',
  'error OwnableUnauthorizedAccount(address account)',
])

export const governorAbi = parseAbi([
  'function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)',
  'function castVote(uint256 proposalId, uint8 support) returns (uint256)',
  'function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)',
  'function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) payable returns (uint256)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)',
  'function proposalEta(uint256 proposalId) view returns (uint256)',
  'function proposalSnapshot(uint256 proposalId) view returns (uint256)',
  'function proposalDeadline(uint256 proposalId) view returns (uint256)',
  'function hasVoted(uint256 proposalId, address account) view returns (bool)',
  'function quorum(uint256 timepoint) view returns (uint256)',
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'function proposalThreshold() view returns (uint256)',
  'function setQuorum(uint256 newQuorum)',
  'function clock() view returns (uint48)',
  'function proposeAccreditation(address university) returns (uint256)',
  'function isResolutionProposal(uint256 proposalId) view returns (bool)',
  'function accreditationProposalId(address university) view returns (uint256)',
  'event AccreditationVoteOpened(address indexed university, uint256 indexed proposalId)',
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)',
  'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)',
  'event ProposalQueued(uint256 proposalId, uint256 etaSeconds)',
  'event ProposalExecuted(uint256 proposalId)',
  'event ProposalCanceled(uint256 proposalId)',
  'event QuorumUpdated(uint256 newQuorum)',
  'error GovernorInsufficientProposerVotes(address proposer, uint256 votes, uint256 threshold)',
  'error GovernorUnexpectedProposalState(uint256 proposalId, uint8 current, bytes32 expectedStates)',
  'error GovernorOnlyExecutor(address account)',
  'error GovernorAlreadyCastVote(address voter)',
  'error GovernorNonexistentProposal(uint256 proposalId)',
])

export const timelockAbi = parseAbi([
  'function getMinDelay() view returns (uint256)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)',
  'event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)',
  'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
  'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
  'error TimelockUnexpectedOperationState(bytes32 operationId, bytes32 expectedStates)',
])

/** Union ABI used to decode any log coming out of the four contracts. */
export const allEventsAbi = [...registryAbi, ...membershipAbi, ...governorAbi, ...timelockAbi]

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

export type ContractTag = 'governor' | 'registry' | 'membership' | 'timelock'

export const CONTRACT_LABEL: Record<ContractTag, string> = {
  governor: 'Governor',
  registry: 'Registry',
  membership: 'Membership',
  timelock: 'Timelock',
}

/** AccessControl role hash → readable name. */
export const ROLE_NAMES: Record<Hex, string> = {
  '0x0000000000000000000000000000000000000000000000000000000000000000': 'DEFAULT_ADMIN_ROLE',
  [keccak256(stringToHex('PROPOSER_ROLE'))]: 'PROPOSER_ROLE',
  [keccak256(stringToHex('EXECUTOR_ROLE'))]: 'EXECUTOR_ROLE',
  [keccak256(stringToHex('CANCELLER_ROLE'))]: 'CANCELLER_ROLE',
}

export const UNI_STATUS = ['None', 'Pending', 'Accredited', 'Revoked'] as const
export const PROPOSAL_STATE = [
  'Pending',
  'Active',
  'Canceled',
  'Defeated',
  'Succeeded',
  'Queued',
  'Expired',
  'Executed',
] as const
export const VOTE_SUPPORT = ['Against', 'For', 'Abstain'] as const
