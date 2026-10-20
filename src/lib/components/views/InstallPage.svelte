<script lang="ts">
  import { pwa } from "$lib/stores/pwaStore";

  export let platform: "chromium" | "ios" | "other" = "other";

  $: isIpad = platform === "ios" && (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 || /iPad/.test(navigator.userAgent));

  let installFailed = false;
  let installSucceeded = false;

  async function handleInstall() {
    const result = await pwa.triggerInstall();
    if (result === "accepted") {
      installSucceeded = true;
    } else if (result === null) {
      // beforeinstallprompt never fired — show fallback instructions
      installFailed = true;
    }
  }
</script>

<main class="install-page">
  <div class="install-content">
    <img
      src="/public/512.png"
      alt="Reader app icon"
      class="install-icon"
      width="128"
      height="128"
    />
    <h1>Reader</h1>
    <p class="tagline">Browse and borrow books from the Internet Archive. Buy DRM-free books from independent publishers.</p>

    {#if installSucceeded}
      <p class="success-message">App installed! Open it from your home screen.</p>
    {:else if platform === "chromium" && !installFailed}
      <button class="acquisition big" on:click={handleInstall}>
        Install app
      </button>
    {:else if platform === "chromium" && installFailed}
      <div class="generic-instructions">
        <h2 class="instruction-heading">Install to your home screen</h2>
        <p class="hint">Follow these steps in your browser.</p>
        <ol>
          <li>Tap the <strong class="more-icon">menu</strong> button in your browser</li>
          <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong></li>
          <li>Tap <strong>Install</strong> to confirm</li>
        </ol>
      </div>
    {:else if platform === "ios"}
      <div class="ios-instructions">
        <h2 class="instruction-heading">Install to your home screen</h2>
        <p class="hint">Make sure you're using Safari to follow these steps.</p>
        <ol>
          {#if !isIpad}
            <li>Tap the <strong>&#x2026; more</strong> button in Safari</li>
          {/if}
          <li>Tap the <strong class="share-icon">share</strong> button</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
          <li class="hint">If you don't see it, tap <strong>View More</strong> first</li>
          <li>Tap <strong>Add</strong></li>
        </ol>
      </div>
    {:else}
      <div class="generic-instructions">
        <h2 class="instruction-heading">Install to your home screen</h2>
        <p class="hint">Follow these steps in your browser.</p>
        <ol>
          <li>Tap the <strong class="more-icon">menu</strong> button in your browser</li>
          <li>
            Tap
            <svg class="add-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path stroke-width="2" d="m18.597,4.44l0,9.33" stroke="currentColor" fill="none"/>
              <line stroke-width="2" x1="14.571" y1="9.082" x2="18.571" y2="13.082" stroke="currentColor" fill="none"/>
              <path stroke-width="2" d="m22.735,9.005l-4.043,4.166" stroke="currentColor" fill="none"/>
              <path stroke-width="2" d="m7.023,17.988c-3.606,3.884 -5.29,3.679 -5.359,3.648c0.069,0.031 19.486,-0.108 19.417,-0.139c0.069,0.031 -4.297,-1.779 -4.99,-3.582l-9.068,0.073z" stroke="currentColor" fill="none"/>
              <path stroke-width="2" d="m15.325,4.583l-12.733,-0.021l0,12.846l17.649,0l0,-2.258" stroke="currentColor" fill="none"/>
            </svg>
            <strong>Add to Home screen</strong>
          </li>
          <li class="hint">If you don't see it, look under an additional <strong>More</strong> submenu</li>
          <li>Tap <strong>Add</strong> to confirm</li>
        </ol>
      </div>
    {/if}

    <button class="skip-button" on:click={() => pwa.dismiss()} aria-label="Skip installation">
      Skip
    </button>
  </div>
</main>

<style>
  .install-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    min-height: 100dvh;
    padding: var(--gap-medium);
    width: 100%;
  }

  .install-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap-medium);
    max-width: var(--container-sm);
    text-align: center;
    width: 100%;
  }

  .install-icon {
    border-radius: var(--border-radius-big-card);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }

  h1 {
    font-family: var(--heading-font);
    font-size: var(--text-size-title);
    margin: 0;
  }

  .tagline {
    color: var(--text-subtle);
    font-size: var(--text-size-md);
  }

  .ios-instructions {
    text-align: left;
  }

  .instruction-heading {
    font-weight: bold;
    font-size: 1rem;
    margin: 0;
    margin-bottom: var(--gap-xsmall);
  }

  .ios-instructions ol {
    padding-left: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: var(--gap-xsmall);
  }

  .share-icon::before {
    content: "";
    display: inline-block;
    width: 0.85em;
    height: 0.85em;
    margin-right: 0.25rem;
    background-color: currentColor;
    mask: url("../../../share-ios.svg") no-repeat center;
    mask-size: contain;
    -webkit-mask: url("../../../share-ios.svg") no-repeat center;
    -webkit-mask-size: contain;
    vertical-align: middle;
  }

  .generic-instructions {
    text-align: left;
  }

  .generic-instructions ol {
    padding-left: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: var(--gap-xsmall);
  }

  .hint {
    color: var(--text-subtle);
    font-size: 0.85rem;
  }

  ol > .hint {
    list-style-type: none;
    margin-left: -1.5rem;
    padding-left: 1.5rem;
  }

  .more-icon::before {
    content: "";
    display: inline-block;
    width: 0.85em;
    height: 0.85em;
    margin-right: 0.25rem;
    background-color: currentColor;
    mask: url("../../../more-vertical.svg") no-repeat center;
    mask-size: contain;
    -webkit-mask: url("../../../more-vertical.svg") no-repeat center;
    -webkit-mask-size: contain;
    vertical-align: middle;
  }

  .success-message {
    font-size: var(--text-size-md);
    color: var(--text-subtle);
  }

  .skip-button {
    background: none;
    border: none;
    color: var(--text-subtle);
    cursor: pointer;
    font-size: 0.8rem;
    font-family: var(--heading-font);
    text-decoration: none;
    padding: var(--gap-xsmall);
    opacity: 0.4;
  }

  .skip-button:hover {
    opacity: 0.7;
  }
</style>
