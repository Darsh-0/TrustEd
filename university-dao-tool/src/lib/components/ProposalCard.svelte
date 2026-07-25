<script lang="ts">
  import { S, actions, isMemberRole, type ProposalRow } from '../chain.svelte'
  import { PROPOSAL_STATE } from '../contracts'
  import { PROPOSAL_STATE_CLASS, shortAddr, shortHex, chainTime } from '../format'
  import { keccak256, stringToHex } from 'viem'

  let { p }: { p: ProposalRow } = $props()

  const stateName = $derived(PROPOSAL_STATE[p.state] ?? `state ${p.state}`)
  const pillClass = $derived(PROPOSAL_STATE_CLASS[p.state] ?? 'muted')
  const member = $derived(isMemberRole())
  const busy = $derived(!!S.pending)

  // meter geometry: bar denominates in total possible votes (member count)
  const denom = $derived(Math.max(Number(S.memberCount), 1))
  const pct = (v: bigint) => (Number(v) / denom) * 100
  const quorumPct = $derived(Math.min((Number(S.quorum) / denom) * 100, 100))
  const quorumReached = $derived(p.forVotes + p.abstain >= S.quorum)
  // mirrors UniversityRegistry.resolveApplication's decision rule
  const willAccredit = $derived(quorumReached && p.forVotes > p.against)

  // timing helpers
  const opensIn = $derived(p.voteStart >= S.block ? p.voteStart - S.block + 1n : 0n)
  const blocksLeft = $derived(p.voteEnd >= S.block ? p.voteEnd - S.block + 1n : 0n)
  const etaIn = $derived(p.eta > S.timestamp ? p.eta - S.timestamp : 0n)
</script>

<article class="card proposal">
  <header class="proposal-head">
    <span class="pill pill-{pillClass}">{stateName}</span>
    {#if p.isResolution}<span class="pill pill-info">resolution vote</span>{/if}
    <h4 class="proposal-title">{p.description}</h4>
  </header>

  <div class="proposal-meta mono">
    id {String(p.id).slice(0, 10)}… · by {shortAddr(p.proposer)} · votes open blocks {p.voteStart}–{p.voteEnd}
  </div>

  <div class="proposal-action">→ executes <code>{p.action}</code></div>

  <div class="meter" role="img" aria-label="For {p.forVotes}, Against {p.against}, Abstain {p.abstain}, quorum {S.quorum} of {S.memberCount}">
    <div class="meter-track">
      {#if p.forVotes > 0n}<span class="seg seg-for" style="width:{pct(p.forVotes)}%"></span>{/if}
      {#if p.against > 0n}<span class="seg seg-against" style="width:{pct(p.against)}%"></span>{/if}
      {#if p.abstain > 0n}<span class="seg seg-abstain" style="width:{pct(p.abstain)}%"></span>{/if}
      <span class="quorum-tick" style="left:{quorumPct}%" title="quorum threshold"></span>
    </div>
    <div class="meter-legend small">
      <span><i class="dot dot-for"></i>For {p.forVotes}</span>
      <span><i class="dot dot-against"></i>Against {p.against}</span>
      <span><i class="dot dot-abstain"></i>Abstain {p.abstain}</span>
      <span class="muted">quorum {S.quorum} of {S.memberCount} {quorumReached ? '✓ reached' : '· not reached'}</span>
    </div>
  </div>

  {#if p.isResolution && (p.state === 0 || p.state === 1 || p.state === 4 || p.state === 5)}
    <div class="resolve-preview small" class:accredit={willAccredit}>
      outcome {p.state === 1 ? 'if voting ended now' : 'when executed'}:
      <strong>{willAccredit ? 'ACCREDIT ✓' : 'REJECT ✗'}</strong>
      <span class="muted">
        — needs quorum ({p.forVotes + p.abstain} of {S.quorum} counted) and For &gt; Against
        ({p.forVotes} vs {p.against}); a failed vote auto-rejects, no second proposal
      </span>
    </div>
  {/if}

  <div class="proposal-actions">
    {#if p.state === 0}
      <span class="muted small">voting opens at block {p.voteStart + 1n}</span>
      <button class="btn" disabled={busy} onclick={() => actions.mine(Number(opensIn))}>⛏ mine {opensIn} to open</button>
    {:else if p.state === 1}
      <div class="btn-row">
        <button class="btn btn-for" disabled={busy || !member || p.hasVoted} onclick={() => actions.vote(p, 1)}>
          {p.isResolution ? 'Accredit (For)' : 'Vote For'}
        </button>
        <button class="btn btn-against" disabled={busy || !member || p.hasVoted} onclick={() => actions.vote(p, 0)}>
          {p.isResolution ? 'Reject (Against)' : 'Against'}
        </button>
        <button class="btn" disabled={busy || !member || p.hasVoted} onclick={() => actions.vote(p, 2)}>Abstain</button>
      </div>
      <span class="muted small">
        {#if p.hasVoted}you voted ·{/if}
        {#if !member}switch to a ministry to vote ·{/if}
        voting closes in {blocksLeft} blocks
      </span>
      <button class="btn" disabled={busy} onclick={() => actions.mine(Number(blocksLeft))}>⛏ mine {blocksLeft} to close voting</button>
    {:else if p.state === 4}
      {#if p.isResolution}
        <button class="btn btn-primary" disabled={busy} onclick={() => actions.queue(p)}>
          Queue resolution → {willAccredit ? 'ACCREDIT' : 'REJECT'}
        </button>
        <span class="muted small">
          voting closed; the outcome is locked in — anyone may queue and execute it
        </span>
      {:else}
        <button class="btn btn-primary" disabled={busy} onclick={() => actions.queue(p)}>Queue in timelock</button>
        <span class="muted small">anyone may queue a succeeded proposal</span>
      {/if}
    {:else if p.state === 5}
      {#if etaIn > 0n}
        <span class="muted small">executable at {chainTime(p.eta)} chain time ({etaIn}s away)</span>
        <button class="btn" disabled={busy} onclick={() => actions.warp(Number(etaIn) + 1)}>⏩ warp {etaIn + 1n}s to maturity</button>
      {:else}
        <button class="btn btn-primary" disabled={busy} onclick={() => actions.execute(p)}>Execute</button>
        <span class="muted small">timelock matured — anyone may execute</span>
      {/if}
    {:else if p.state === 3}
      <span class="muted small">
        {#if p.forVotes + p.against + p.abstain === 0n}
          defeated — nobody voted before the deadline (block {p.voteEnd}). Votes are cast on this
          card while it is Active.
        {:else if !quorumReached}
          defeated — quorum not reached ({p.forVotes + p.abstain} of {S.quorum} needed)
        {:else}
          defeated — not more For than Against
        {/if}
      </span>
      <button class="btn" disabled={busy || !member} onclick={() => actions.repropose(p)}>
        ↻ Re-propose (fresh vote)
      </button>
    {:else if p.state === 7}
      <span class="good small">✓ executed through the timelock</span>
    {/if}
  </div>

  <details class="raw">
    <summary>raw on-chain payload</summary>
    <dl class="raw-grid mono small">
      <dt>proposalId</dt>
      <dd>{p.id}</dd>
      <dt>target</dt>
      <dd>{p.targets[0]}</dd>
      <dt>calldata</dt>
      <dd class="wrap">{shortHex(p.calldatas[0], 40)}</dd>
      <dt>descriptionHash</dt>
      <dd class="wrap">{keccak256(stringToHex(p.description))}</dd>
    </dl>
    <p class="hint">
      queue/execute are called with the same targets/values/calldatas plus this hash — not the
      proposal id.
    </p>
  </details>
</article>
