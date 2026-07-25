<script lang="ts">
  import { S, toast } from '../chain.svelte'
  import { CONTRACT_LABEL, type ContractTag } from '../contracts'
  import { shortHash } from '../format'

  let filter: 'all' | ContractTag = $state('all')

  const rows = $derived(filter === 'all' ? S.feed : S.feed.filter((f) => f.contract === filter))

  async function copyTx(tx: string) {
    await navigator.clipboard.writeText(tx)
    toast('info', 'transaction hash copied')
  }

  const filters: Array<'all' | ContractTag> = ['all', 'governor', 'registry', 'membership', 'timelock']
</script>

<section class="card feed-card">
  <header class="card-head">
    <h3>On-chain activity</h3>
    <span class="muted small">{rows.length} events, live</span>
  </header>

  <div class="chip-row">
    {#each filters as f (f)}
      <button class="chip" class:active={filter === f} onclick={() => (filter = f)}>
        {#if f !== 'all'}<i class="dot dot-{f}"></i>{/if}
        {f === 'all' ? 'All' : CONTRACT_LABEL[f]}
      </button>
    {/each}
  </div>

  <ol class="feed">
    {#each rows as item (item.key)}
      <li class="feed-item">
        <div class="feed-top">
          <span class="feed-contract"><i class="dot dot-{item.contract}"></i>{CONTRACT_LABEL[item.contract]}</span>
          <span class="feed-event">{item.event}</span>
          <span class="feed-block mono">#{item.block}</span>
        </div>
        <div class="feed-summary">{item.summary}</div>
        <button class="feed-tx mono" title="copy transaction hash" onclick={() => copyTx(item.txHash)}>
          {shortHash(item.txHash)}
        </button>
      </li>
    {:else}
      <li class="feed-empty muted">No events yet — deploy and start playing.</li>
    {/each}
  </ol>
</section>
