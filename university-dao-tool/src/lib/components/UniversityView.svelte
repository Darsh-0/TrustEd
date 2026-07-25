<script lang="ts">
  import type { Hex } from 'viem'
  import { S, actions, role, isMemberRole, universityOf } from '../chain.svelte'
  import { SAMPLE_KEYS } from '../accounts'
  import { UNI_STATUS } from '../contracts'
  import { UNI_STATUS_CLASS, chainDate } from '../format'

  const me = $derived(role())
  const ministry = $derived(isMemberRole())
  const myUni = $derived(universityOf(me?.address))

  const suggestedName = $derived.by(() => {
    const hint = me?.seededAs ?? ''
    return hint.startsWith('suggested: ') ? hint.slice('suggested: '.length) : ''
  })

  function randomKey(): Hex {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    return ('0x' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')) as Hex
  }

  // application form
  let name = $state('')
  let country = $state('NZ')
  let keyType = $state('ed25519')
  let publicKey = $state<string>(SAMPLE_KEYS[0])

  // seed sensible defaults whenever the selected account changes
  $effect(() => {
    name = suggestedName
    country = suggestedName.includes('Munich') ? 'DE' : 'NZ'
    publicKey = SAMPLE_KEYS[(me?.index ?? 0) % SAMPLE_KEYS.length]
  })

  // rotation form
  let rotKeyType = $state('ed25519')
  let rotKey = $state<string>(SAMPLE_KEYS[1])

  const canApply = $derived(!myUni || myUni.status === 0 || myUni.status === 3)
  const busy = $derived(!!S.pending)
</script>

<div class="view">
  {#if !me}
    <section class="card empty">
      <h3>The observer has no key</h3>
      <p class="muted">
        Reads still work (see the Registry tab) — that is the point. To role-play a university,
        switch to one of the university accounts in the header.
      </p>
    </section>
  {:else if ministry}
    <section class="card empty">
      <h3>This account is a ministry</h3>
      <p class="muted">
        Ministries govern; they do not apply. Switch to a non-member account (e.g. account #6 or
        #7) to act as a university.
      </p>
    </section>
  {:else}
    {#if myUni && myUni.status !== 0}
      <section class="card">
        <header class="card-head">
          <h3>{myUni.name}</h3>
          <span class="pill pill-{UNI_STATUS_CLASS[myUni.status]}">{UNI_STATUS[myUni.status]}</span>
        </header>
        <div class="kv small">
          <span class="muted">country</span><span>{myUni.country}</span>
          <span class="muted">key type</span><span>{myUni.keyType}</span>
          <span class="muted">last updated</span><span>{chainDate(myUni.lastUpdated)}</span>
          <span class="muted">address (your identity)</span><span class="mono">{me.address}</span>
        </div>
        <div class="key-block">
          <div class="key-label small muted">
            {myUni.status === 2 ? 'live public key (what verifiers see)' : 'submitted public key'}
          </div>
          <code class="key mono">{myUni.publicKey}</code>
        </div>
        {#if myUni.pendingKey}
          <div class="key-block pending">
            <div class="key-label small muted">staged rotation — waiting for a DAO vote</div>
            <code class="key mono">{myUni.pendingKey}</code>
          </div>
        {/if}
        <p class="hint">
          {#if myUni.status === 1}
            Your application is pending. A ministry must propose accreditation and the DAO must
            vote it through — watch the Governance tab.
          {:else if myUni.status === 2}
            You are accredited. Verifiers can now resolve your key with a free
            <code>publicKeyOf</code> call. You can stage a key rotation below — it changes nothing
            until the DAO approves it.
          {:else if myUni.status === 3}
            Your accreditation was revoked. You may re-apply below.
          {/if}
        </p>
      </section>
    {/if}

    {#if canApply}
      <section class="card">
        <header class="card-head">
          <h3>{myUni && myUni.status === 3 ? 'Re-apply for accreditation' : 'Apply for accreditation'}</h3>
        </header>
        <p class="hint">
          Applying is permissionless: the transaction's <code>msg.sender</code> —
          <span class="mono">{me.address}</span> — becomes your on-chain identity. Nobody, not
          even the DAO, can submit or edit key material on your behalf.
        </p>
        <form
          class="form"
          onsubmit={(e) => {
            e.preventDefault()
            void actions.submitApplication(name, country, keyType, publicKey as Hex)
          }}
        >
          <label>university name <input required bind:value={name} placeholder="University of Canterbury" /></label>
          <div class="form-row">
            <label>country (ISO 3166-1) <input required maxlength="2" bind:value={country} /></label>
            <label>
              key type
              <select bind:value={keyType}>
                <option>ed25519</option>
                <option>secp256k1</option>
                <option>rsa-2048</option>
              </select>
            </label>
          </div>
          <label>
            public key (hex bytes, self-published)
            <textarea required rows="2" class="mono" bind:value={publicKey}></textarea>
          </label>
          <div class="btn-row">
            <button type="button" class="btn" onclick={() => (publicKey = randomKey())}>🎲 random key</button>
            <button type="submit" class="btn btn-primary" disabled={busy}>Submit application</button>
          </div>
        </form>
      </section>
    {/if}

    {#if myUni?.status === 2}
      <section class="card">
        <header class="card-head"><h3>Request key rotation</h3></header>
        <p class="hint">
          This stages a new key next to your live one and emits
          <code>KeyRotationRequested</code>. Your live key keeps answering
          <code>publicKeyOf</code> until a DAO proposal executes
          <code>approveKeyRotation</code> — no key becomes authoritative without a vote.
        </p>
        <form
          class="form"
          onsubmit={(e) => {
            e.preventDefault()
            void actions.requestKeyRotation(rotKeyType, rotKey as Hex)
          }}
        >
          <div class="form-row">
            <label>
              key type
              <select bind:value={rotKeyType}>
                <option>ed25519</option>
                <option>secp256k1</option>
                <option>rsa-2048</option>
              </select>
            </label>
          </div>
          <label>new public key <textarea required rows="2" class="mono" bind:value={rotKey}></textarea></label>
          <div class="btn-row">
            <button type="button" class="btn" onclick={() => (rotKey = randomKey())}>🎲 random key</button>
            <button type="submit" class="btn btn-primary" disabled={busy}>Stage rotation</button>
          </div>
        </form>
      </section>
    {/if}
  {/if}
</div>
