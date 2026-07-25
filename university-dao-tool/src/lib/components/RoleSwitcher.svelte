<script lang="ts">
  import { S, role, isMemberRole, universityOf, refresh } from '../chain.svelte'
  import { ACCOUNTS } from '../accounts'
  import { shortAddr } from '../format'
  import { UNI_STATUS } from '../contracts'

  function labelFor(i: number): string {
    const a = ACCOUNTS[i]
    const lc = a.address.toLowerCase()
    const m = S.members.find((x) => x.addr.toLowerCase() === lc)
    if (m) return `🏛 ${m.name}`
    const u = S.universities.find((x) => x.addr.toLowerCase() === lc)
    if (u && u.status !== 0) return `🎓 ${u.name}`
    return a.seededAs ? `#${i} · ${a.seededAs}` : `#${i} · account ${shortAddr(a.address)}`
  }

  const badge = $derived.by(() => {
    const r = role()
    if (!r) return { text: 'Observer — read-only, no key', cls: 'muted' }
    if (isMemberRole()) return { text: 'Ministry · voting power 1', cls: 'info' }
    const u = universityOf(r.address)
    if (u && u.status !== 0) return { text: `University · ${UNI_STATUS[u.status]}`, cls: 'warning' }
    return { text: `Unaffiliated · ${shortAddr(r.address)}`, cls: 'muted' }
  })
</script>

<div class="role-switcher">
  <label class="role-label" for="role-select">acting as</label>
  <select
    id="role-select"
    class="role-select"
    bind:value={S.roleIndex}
    onchange={() => void refresh()}
  >
    <optgroup label="Observer">
      <option value={-1}>👁 Observer (reads only, proves no wallet is needed)</option>
    </optgroup>
    <optgroup label="Accounts (anvil dev keys)">
      {#each ACCOUNTS as a (a.index)}
        <option value={a.index}>{labelFor(a.index)}</option>
      {/each}
    </optgroup>
  </select>
  <span class="pill pill-{badge.cls}">{badge.text}</span>
</div>
