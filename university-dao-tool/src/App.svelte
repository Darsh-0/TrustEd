<script lang="ts">
  import { onMount } from 'svelte'
  import type { Address } from 'viem'
  import { S, initChain, saveSettings } from './lib/chain.svelte'
  import RoleSwitcher from './lib/components/RoleSwitcher.svelte'
  import ChainControls from './lib/components/ChainControls.svelte'
  import ActivityFeed from './lib/components/ActivityFeed.svelte'
  import RegistryView from './lib/components/RegistryView.svelte'
  import UniversityView from './lib/components/UniversityView.svelte'
  import GovernanceView from './lib/components/GovernanceView.svelte'

  let tab: 'registry' | 'university' | 'governance' = $state('registry')

  // settings form (populated from persisted state after init)
  let sRpc = $state('')
  let sGovernor = $state('')
  let sRegistry = $state('')
  let sMembership = $state('')
  let sTimelock = $state('')

  onMount(() => {
    const stop = initChain()
    sRpc = S.rpc
    sGovernor = S.addr.governor
    sRegistry = S.addr.registry
    sMembership = S.addr.membership
    sTimelock = S.addr.timelock
    return stop
  })

  function applySettings(e: Event) {
    e.preventDefault()
    saveSettings(sRpc, {
      governor: sGovernor as Address,
      registry: sRegistry as Address,
      membership: sMembership as Address,
      timelock: sTimelock as Address,
    })
  }
</script>

<div class="app">
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark">🎓</span>
      <div>
        <h1>Accreditation DAO</h1>
        <span class="brand-sub">local playground · anvil dev keys only</span>
      </div>
    </div>

    <RoleSwitcher />

    <details class="settings">
      <summary class="btn">⚙ connection</summary>
      <form class="settings-panel card form" onsubmit={applySettings}>
        <label>RPC URL <input class="mono" bind:value={sRpc} /></label>
        <label>Governor <input class="mono" bind:value={sGovernor} /></label>
        <label>Registry <input class="mono" bind:value={sRegistry} /></label>
        <label>Membership <input class="mono" bind:value={sMembership} /></label>
        <label>Timelock <input class="mono" bind:value={sTimelock} /></label>
        <button type="submit" class="btn btn-primary">Save & reconnect</button>
        <p class="hint">defaults match a fresh anvil + <code>Deploy.s.sol</code></p>
      </form>
    </details>
  </header>

  {#if S.checkedOnce && !S.connected}
    <section class="card banner err">
      <h3>Can't reach the RPC at <code>{S.rpc}</code></h3>
      <pre class="mono">anvil</pre>
      <p class="hint">start anvil, then this page reconnects by itself.</p>
    </section>
  {:else if S.checkedOnce && !S.deployed}
    <section class="card banner">
      <h3>anvil is up — contracts not found</h3>
      <p>Deploy the DAO, then this page picks it up automatically:</p>
      <pre class="mono">cd university-dao
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast</pre>
      <p class="hint">
        the default addresses assume a fresh anvil (deterministic deployer nonces); if you
        deployed elsewhere, set the addresses under ⚙ connection.
      </p>
    </section>
  {/if}

  <nav class="tabs">
    <button class="tab" class:active={tab === 'registry'} onclick={() => (tab = 'registry')}>
      Registry <span class="tab-sub">public reads</span>
    </button>
    <button class="tab" class:active={tab === 'university'} onclick={() => (tab = 'university')}>
      University desk <span class="tab-sub">apply & rotate keys</span>
    </button>
    <button class="tab" class:active={tab === 'governance'} onclick={() => (tab = 'governance')}>
      Governance <span class="tab-sub">propose · vote · execute</span>
    </button>
  </nav>

  <main class="layout">
    <div class="content">
      {#if tab === 'registry'}
        <RegistryView />
      {:else if tab === 'university'}
        <UniversityView />
      {:else}
        <GovernanceView />
      {/if}
    </div>
    <aside class="side">
      <ChainControls />
      <ActivityFeed />
    </aside>
  </main>

  <div class="toasts">
    {#each S.toasts as t (t.id)}
      <div class="toast toast-{t.kind}">{t.text}</div>
    {/each}
  </div>

  {#if S.pending}
    <div class="pending-bar mono">⏳ {S.pending}…</div>
  {/if}
</div>
