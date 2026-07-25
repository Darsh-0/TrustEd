<script lang="ts">
  import { S, toast } from '../chain.svelte'
  import { UNI_STATUS } from '../contracts'
  import { UNI_STATUS_CLASS, chainDate, shortAddr } from '../format'

  const accredited = $derived(S.universities.filter((u) => u.status === 2))
  const others = $derived(S.universities.filter((u) => u.status !== 2))

  async function copyKey(k: string) {
    await navigator.clipboard.writeText(k)
    toast('info', 'public key copied')
  }
</script>

<div class="view">
  <section class="hero card">
    <h2>Public registry of accredited universities</h2>
    <p>
      Everything on this page is read with free <code>eth_call</code>s — even the
      <strong>Observer</strong> role (no key, no wallet, no gas) sees it. This is the consumer
      surface a diploma verifier, registrar, or employer would integrate:
      <code>isAccredited(address)</code> and <code>publicKeyOf(address)</code>.
    </p>
    <div class="tiles">
      <div class="tile">
        <div class="tile-value">{accredited.length}</div>
        <div class="tile-label">accredited universities</div>
      </div>
      <div class="tile">
        <div class="tile-value">{S.universities.length}</div>
        <div class="tile-label">applicants ever</div>
      </div>
      <div class="tile">
        <div class="tile-value">{S.memberCount}</div>
        <div class="tile-label">member ministries</div>
      </div>
    </div>
  </section>

  {#if accredited.length > 0}
    <div class="uni-grid">
      {#each accredited as u (u.addr)}
        <article class="card uni-card">
          <header class="card-head">
            <h3>{u.name}</h3>
            <span class="pill pill-good">✓ Accredited</span>
          </header>
          <div class="kv small">
            <span class="muted">country</span><span>{u.country}</span>
            <span class="muted">address</span><span class="mono">{shortAddr(u.addr)}</span>
            <span class="muted">key type</span><span>{u.keyType}</span>
            <span class="muted">last updated</span><span>{chainDate(u.lastUpdated)}</span>
          </div>
          <div class="key-block">
            <div class="key-label small muted">
              live public key — self-published, DAO-approved
              <button class="chip" onclick={() => copyKey(u.publicKey)}>copy</button>
            </div>
            <code class="key mono">{u.publicKey}</code>
          </div>
          {#if u.pendingKey}
            <div class="key-block pending">
              <div class="key-label small muted">staged rotation (inert until the DAO approves)</div>
              <code class="key mono">{u.pendingKey}</code>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {:else}
    <section class="card empty">
      <p class="muted">
        No accredited universities yet. Switch to a university account, apply, then run the
        proposal lifecycle from the Governance tab.
      </p>
    </section>
  {/if}

  {#if others.length > 0}
    <section class="card">
      <header class="card-head"><h3>Applications & revocations</h3></header>
      <table class="table">
        <thead>
          <tr><th>university</th><th>country</th><th>address</th><th>status</th></tr>
        </thead>
        <tbody>
          {#each others as u (u.addr)}
            <tr>
              <td>{u.name}</td>
              <td>{u.country}</td>
              <td class="mono">{shortAddr(u.addr)}</td>
              <td><span class="pill pill-{UNI_STATUS_CLASS[u.status]}">{UNI_STATUS[u.status]}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
</div>
