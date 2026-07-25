<script lang="ts">
  import { S, actions } from '../chain.svelte'
  import { chainTime } from '../format'

  const closeVotingBlocks = $derived(Number(S.votingPeriod) + 1)
  const matureSeconds = $derived(Number(S.minDelay) + 1)
</script>

<section class="card">
  <header class="card-head">
    <h3>Chain controls</h3>
    <span class="live-dot" class:on={S.connected} title={S.connected ? 'RPC connected' : 'RPC down'}
    ></span>
  </header>

  <div class="tiles">
    <div class="tile">
      <div class="tile-value">{S.block}</div>
      <div class="tile-label">block height</div>
    </div>
    <div class="tile">
      <div class="tile-value">{chainTime(S.timestamp)}</div>
      <div class="tile-label">chain time</div>
    </div>
  </div>

  <div class="btn-row">
    <button class="btn" disabled={!!S.pending} onclick={() => actions.mine(1)}>⛏ mine 1 block</button>
    <button class="btn" disabled={!!S.pending} onclick={() => actions.mine(closeVotingBlocks)}>
      ⛏ mine {closeVotingBlocks} (close voting)
    </button>
    <button class="btn" disabled={!!S.pending} onclick={() => actions.warp(matureSeconds)}>
      ⏩ +{matureSeconds}s (mature timelock)
    </button>
  </div>

  <p class="hint">
    anvil mines one block per transaction and time stands still between them — governance deadlines
    only pass when you push the chain forward. These buttons call <code>anvil_mine</code> /
    <code>evm_increaseTime</code>.
  </p>

  <div class="params mono">
    votingDelay {S.votingDelay} blk · votingPeriod {S.votingPeriod} blk · timelock {S.minDelay}s ·
    quorum {S.quorum} of {S.memberCount}
  </div>
</section>
