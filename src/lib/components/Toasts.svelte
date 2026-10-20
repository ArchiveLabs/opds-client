<script lang="ts">
	import { toasts } from "$lib/stores/toastStore";
	import { fly } from "svelte/transition";
</script>

<div class="toast-container" aria-live="polite" aria-label="Notifications">
	{#each $toasts as toast (toast.id)}
		<div
			class="toast"
			class:success={toast.variant === "success"}
			class:error={toast.variant === "error"}
			class:info={toast.variant === "info"}
			role="status"
			transition:fly={{ y: 16, duration: 240 }}
		>
			<span class="toast-message">{toast.message}</span>
			<button
				class="toast-dismiss"
				aria-label="Dismiss notification"
				on:click={() => toasts.dismiss(toast.id)}
			>
				×
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: var(--gap-medium);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		gap: var(--gap-xsmall);
		z-index: 100;
		pointer-events: none;
		max-width: min(92vw, 28rem);
		width: max-content;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: baseline;
		gap: var(--gap-small);
		padding: var(--gap-small) var(--gap-medium);
		background-color: var(--bg-toast);
		color: var(--text-on-toast);
		border-radius: var(--border-radius-big-card);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
		font-family: var(--heading-font), Georgia, serif;
		font-size: var(--text-size-md);
		line-height: 1.4;
	}

	.toast-message {
		flex: 1;
		letter-spacing: 0.01em;
	}

	/* Override the global .success rule (bright green text + checkmark):
	   inside a toast we want the inverted palette text and a muted accent. */
	.toast.success {
		color: var(--text-on-toast);
		font-size: var(--text-size-md);
	}

	.toast.success::before {
		background-color: var(--toast-accent);
	}

	.toast-dismiss {
		background: transparent;
		border: none;
		color: var(--text-on-toast);
		opacity: 0.6;
		font-size: 1.3rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		font-family: var(--heading-font), Georgia, serif;
		align-self: center;
	}

	.toast-dismiss:hover {
		opacity: 1;
	}
</style>
