<script lang="ts">
  import { opds } from "$lib/stores/opdsStore.js";

  console.log("Loading Profile");

  // Get profile data from the store
  $: profile = $opds.state as any;

  // Derive properties for easier template access
  $: name = profile?.name;
  $: email = profile?.email;
  $: loans = profile?.loans;
  $: holds = profile?.holds;
  $: links = profile?.links || [];

  // Find specific links using the store's helper function
  $: shelfLink = opds.getLink(links, { rel: "http://opds-spec.org/shelf" });
  $: editLink = opds.getLink(links, { rel: "edit" });

  $: isInternetArchive = opds.isInternetArchiveUrl(opds.getOrigin());

  /**
   * Handles navigation for OPDS links
   */
  function handleNavClick(nav: any) {
    if (nav?.href) {
      opds.loadFromUrl(nav.href, nav.type);
    }
  }

  /**
   * Creates the relative URL for OPDS links
   */
  function createHref(nav: any) {
    return nav?.href ? `?opds=${encodeURIComponent(nav.href)}` : "#";
  }
</script>

<main id="main-content">
  <h2>Profile</h2>

  <div class="card">
    <section class="profile-details">
      <h3>General</h3>
      {#if name || email}
        <div class="stat-row">
          {#if name}
            <div class="stat-box stat-box--text">
              <span class="stat-label">Name</span>
              <span class="stat-text">{name}</span>
            </div>
          {/if}
          {#if email}
            <div class="stat-box stat-box--text">
              <span class="stat-label">Email</span>
              <span class="stat-text">{email}</span>
            </div>
          {/if}
        </div>
      {/if}
    </section>

    {#if loans}
      <section class="profile-section">
        <h3>Loans</h3>
        <div class="stat-row">
          <div class="stat-box">
            <span class="stat-fraction">
              <span class="stat-number">{loans.total - loans.available}</span>
              <span class="stat-separator">/</span>
              <span class="stat-number stat-limit">{loans.total}</span>
            </span>
            <span class="stat-label">Books borrowed</span>
          </div>
        </div>
      </section>
    {/if}

    {#if holds && holds.total > 0}
      <section class="profile-section">
        <h3>Holds</h3>
        <div class="stat-row">
          <div class="stat-box">
            <span class="stat-fraction">
              <span class="stat-number">{holds.total - holds.available}</span>
              <span class="stat-separator">/</span>
              <span class="stat-number stat-limit">{holds.total}</span>
            </span>
            <span class="stat-label">Books on hold</span>
          </div>
        </div>
      </section>
    {/if}

    {#if isInternetArchive}
      <section class="profile-section links-section">
        <h3>Purchases</h3>
        <nav aria-label="Purchases">
          <ul>
            <li>
              <a
                class="small acquisition external"
                href="https://www.betterworldbooks.com/My/Account/Orders"
                target="_blank"
                rel="noopener noreferrer"
              >
                Better World Books
              </a>
            </li>
          </ul>
        </nav>
      </section>
    {/if}
    <section class="profile-details">
      <h3>Account</h3>
      <nav aria-label="Account links">
        <ul>
          {#if editLink}
            <li>
              <a
                class="small acquisition external"
                href={editLink.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Go to Account Settings
              </a>
            </li>
          {/if}
          <li>
            <button class="small acquisition" on:click={() => opds.signOut()}>
              Sign out
            </button>
          </li>
        </ul>
      </nav>
    </section>
  </div>
</main>

<style>
  h2 {
    margin-bottom: var(--gap-small);
  }

  ul {
    padding-left: 0px;
  }

  .card {
    background-color: var(--bg-card);
    border-radius: var(--border-radius-big-card);
    padding: var(--gap-medium);
    display: flex;
    flex-direction: column;
    gap: var(--gap-small);
  }

  .profile-details h3,
  .profile-section h3 {
    margin-top: 0;
    margin-bottom: var(--gap-small);
  }

  .profile-section {
    border-top: 1px solid var(--bg-card-subtle-overlay);
    padding-top: var(--gap-small);
  }

  .links-section ul,
  .profile-details nav {
    margin-top: var(--gap-small);
  }

  .profile-details nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--gap-small);
  }

  .links-section li,
  .profile-details nav li {
    display: contents;
  }

  .stat-row {
    display: flex;
    gap: var(--gap-small);
    flex-wrap: wrap;
  }

  @media (max-width: 480px) {
    .stat-row {
      flex-direction: column;
    }

    .stat-box--text {
      flex: unset;
      width: 100%;
    }
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap-xxsmall);
    padding: var(--gap-small) var(--gap-medium);
    background-color: var(--bg-card-secondary);
    border-radius: var(--border-radius-menu);
    min-width: 5rem;
  }

  .stat-box--text {
    align-items: flex-start;
    flex: 1;
    min-width: 0;
  }

  .stat-text {
    font-size: var(--text-size-md);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .stat-fraction {
    display: flex;
    align-items: baseline;
    gap: 0.3em;
  }

  .stat-separator {
    font-size: var(--text-size-lg);
    color: var(--text-subtle);
    font-weight: 300;
  }

  .stat-number {
    font-size: var(--text-size-title);
    font-weight: 700;
    line-height: 1;
    color: var(--text-available);
  }

  .stat-number.stat-limit {
    color: var(--text-subtle);
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
