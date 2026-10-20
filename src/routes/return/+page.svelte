<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  onMount(() => {
    if (browser) {
      window.close();
    }
  });
</script>

<div class="content" style="text-align: center; padding-top: 4rem;">
  <p>You can close this window now.</p>
</div>
