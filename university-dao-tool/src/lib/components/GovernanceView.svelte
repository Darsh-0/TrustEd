<script lang="ts">
  import type { Address } from 'viem'
  import { isAddress } from 'viem'
  import { S, actions, isMemberRole, hasOpenProposalTargeting } from '../chain.svelte'
  import { ACCOUNTS } from '../accounts'
  import { UNI_STATUS } from '../contracts'
  import { UNI_STATUS_CLASS, shortAddr } from '../format'
  import ProposalCard from './ProposalCard.svelte'

  const member = $derived(isMemberRole())
  const busy = $derived(!!S.pending)
  const accreditedCount = $derived(S.universities.filter((u) => u.status === 2).length)
  const activeCount = $derived(S.proposals.filter((p) => p.state === 0 || p.state === 1 || p.state === 4 || p.state === 5).length)

  // per-university discredit reasons
  let reasons: Record<string, string> = $state({})

  // invite form
  let inviteAddr = $state('')
  let inviteName = $state('')
  const unusedAccounts = $derived(
    ACCOUNTS.filter(
      (a) =>
        !S.members.some((m) => m.addr.toLowerCase() === a.address.toLowerCase()) &&
        !S.universities.some((u) => u.addr.toLowerCase() === a.address.toLowerCase()),
    ),
  )

  // quorum form
  let newQuorum = $state(4)

  const firstUni = $derived(S.universities[0])
</script>

<div class="view">
  <section class="card hero">
    <h2>Governance desk</h2>
    <p>
      Every privileged function in the system is owned by the timelock, and the only path into the
      timelock is a passed proposal. Propose → vote → queue → execute; watch each step land in the
      activity feed.
    </p>
    <div class="tiles">
      <div class="tile"><div class="tile-value">{S.memberCount}</div><div class="tile-label">member ministries</div></div>
      <div class="tile"><div class="tile-value">{S.quorum}</div><div class="tile-label">quorum</div></div>
      <div class="tile"><div class="tile-value">{activeCount}</div><div class="tile-label">proposals in flight</div></div>
      <div class="tile"><div class="tile-value">{accreditedCount}</div><div class="tile-label">accredited</div></div>
    </div>
    {#if !member}
      <p class="hint warn">
        You are not acting as a member ministry — everything below is read-only until you switch
        roles in the header.
      </p>
    {/if}
  </section>

  <section class="card">
    <header class="card-head"><h3>Applications</h3></header>
    {#if S.universities.length === 0}
      <p class="muted small">Nothing yet — have a university apply from the University tab.</p>
    {:else}
      <ul class="rows">
        {#each S.universities as u (u.addr)}
          <li class="row">
            <div class="row-main">
              <strong>{u.name}</strong>
              <span class="muted small">{u.country} · <span class="mono">{shortAddr(u.addr)}</span></span>
              <span class="pill pill-{UNI_STATUS_CLASS[u.status]}">{UNI_STATUS[u.status]}</span>
              {#if u.pendingKey}<span class="pill pill-warning">rotation staged</span>{/if}
            </div>
            <div class="row-actions btn-row">
              {#if hasOpenProposalTargeting(u.addr)}
                <a class="pill pill-info" href="#proposals">proposal in flight — vote on its card below ↓</a>
              {:else if u.status === 1}
                <div class="stack">
                  <button class="btn btn-primary" disabled={busy || !member} onclick={() => actions.proposeResolution(u)}>
                    Put application to a vote
                  </button>
                  <span class="muted small">one vote settles it: For = accredit · fails = auto-reject</span>
                </div>
              {:else if u.status === 2}
                {#if u.pendingKey}
                  <button class="btn btn-primary" disabled={busy || !member} onclick={() => actions.proposeApproveRotation(u)}>
                    Propose key-rotation approval
                  </button>
                {/if}
                <details class="inline-form">
                  <summary class="btn btn-danger-outline">Propose discredit…</summary>
                  <div class="btn-row">
                    <input
                      placeholder="reason (goes on-chain)"
                      bind:value={reasons[u.addr]}
                    />
                    <button
                      class="btn btn-danger"
                      disabled={busy || !member}
                      onclick={() => actions.proposeDiscredit(u, reasons[u.addr] || 'accreditation standards violation')}
                    >
                      Propose
                    </button>
                  </div>
                </details>
              {:else if u.status === 3}
                <span class="muted small">revoked — may re-apply itself</span>
              {:else}
                <span class="muted small">no live application</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="card">
    <header class="card-head"><h3>Membership</h3></header>
    <ul class="rows">
      {#each S.members as m (m.addr)}
        <li class="row">
          <div class="row-main">
            <strong>🏛 {m.name}</strong>
            <span class="muted small mono">{shortAddr(m.addr)}</span>
            <span class="pill pill-info">{m.votes} vote</span>
          </div>
          <div class="row-actions">
            <button class="btn btn-danger-outline" disabled={busy || !member} onclick={() => actions.proposeDisinvite(m)}>
              Propose removal
            </button>
          </div>
        </li>
      {/each}
    </ul>
    <form
      class="form"
      onsubmit={(e) => {
        e.preventDefault()
        if (!isAddress(inviteAddr)) return
        void actions.proposeInvite(inviteAddr as Address, inviteName || 'Unnamed Ministry')
        inviteAddr = ''
        inviteName = ''
      }}
    >
      <div class="form-row">
        <label>
          new ministry address
          <input required list="unused-accounts" class="mono" bind:value={inviteAddr} placeholder="0x…" />
          <datalist id="unused-accounts">
            {#each unusedAccounts as a (a.index)}
              <option value={a.address}>account #{a.index}</option>
            {/each}
          </datalist>
        </label>
        <label>name <input required bind:value={inviteName} placeholder="Estonian Ministry of Education" /></label>
      </div>
      <div class="btn-row">
        <button type="submit" class="btn btn-primary" disabled={busy || !member || !isAddress(inviteAddr)}>
          Propose invitation
        </button>
      </div>
    </form>
  </section>

  <section class="card">
    <header class="card-head"><h3>Parameters & the bypass test</h3></header>
    <div class="form-row split">
      <form
        class="form"
        onsubmit={(e) => {
          e.preventDefault()
          void actions.proposeSetQuorum(BigInt(newQuorum))
        }}
      >
        <label>
          quorum (absolute member count, currently {S.quorum})
          <input type="number" min="1" bind:value={newQuorum} />
        </label>
        <button type="submit" class="btn" disabled={busy || !member}>Propose quorum change</button>
        <p class="hint">
          <code>setQuorum</code> is <code>onlyGovernance</code> — even the governor contract cannot
          call it directly; only an executed proposal can.
        </p>
      </form>
      <div class="form danger-zone">
        <span class="dz-label">try to bypass the DAO</span>
        <button
          class="btn btn-danger"
          disabled={busy || !firstUni}
          onclick={() => firstUni && actions.directAccredit(firstUni)}
        >
          Call registry.accredit() directly
        </button>
        <p class="hint">
          Sends a real transaction from your current account straight to the registry. It will
          revert with <code>OwnableUnauthorizedAccount</code> — only the timelock may call it.
          That revert <em>is</em> the security model.
        </p>
      </div>
    </div>
  </section>

  <section class="proposals" id="proposals">
    <header class="section-head">
      <h3>Proposals</h3>
      <span class="muted small">
        {S.proposals.length} total, newest first — proposing only opens a vote; ministries cast
        For/Against on each card while it is Active
      </span>
    </header>
    {#each S.proposals as p (p.id)}
      <ProposalCard {p} />
    {:else}
      <section class="card empty">
        <p class="muted">No proposals yet. Propose accreditation of a pending university above.</p>
      </section>
    {/each}
  </section>
</div>
