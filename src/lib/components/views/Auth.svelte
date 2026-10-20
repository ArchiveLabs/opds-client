<script lang="ts">
	import { opds } from "$lib/stores/opdsStore.js";
	import {
		findPkceAuth, findImplicitAuth, getAuthLinks, getAuthEndpoint,
		startPkceRedirect, buildImplicitRedirectUrl,
	} from "$lib/auth.js";

	console.log("Loading Auth");

	// Local state
	let errorMessage = "";
	let submitState: "idle" | "loading" | "done" | "error" = "idle";
	let credentials = { email: "", otp: "", username: "", password: "" };

	// Derived store data
	$: opdsState = $opds.state as any;
	$: authentication = opdsState?.authentication || [];
	$: authDesc = opdsState?.description || "";
	$: authTitle = opdsState?.title || "";
	$: attemptedUrl = $opds.attemptedUrl || "";
	$: attemptedIntent = $opds.attemptedIntent ?? undefined;

	$: pkceEntry = findPkceAuth(authentication);
	$: implicitEntry = findImplicitAuth(authentication);
	$: implicitLinks = getAuthLinks(authentication);

	let attemptingAction = false;

	function passwordBased(): any {
		return undefined;
	}

	// --- Password-based login ---
	async function submitForm(endpoint: string) {
		submitState = "loading";
		errorMessage = "";
		try {
			console.log("Submitting to", endpoint, credentials);
			await new Promise((res) => setTimeout(res, 800));
			submitState = "done";
		} catch (err) {
			errorMessage = "Login failed";
		} finally {
			submitState = "idle";
		}
	}
</script>

<main id="main-content" class="auth-container">
	<section class="auth-card">
		<div class="auth-header">
			<h2>{authTitle}</h2>
			{#if authDesc}<p class="auth-desc">{authDesc}</p>{/if}
		</div>

		{#if pkceEntry}
			<div class="login-form">
				{#if errorMessage}
					<p role="alert" class="error-text">{errorMessage}</p>
				{/if}
				<button
					class="small acquisition raised"
					aria-busy={attemptingAction}
					on:click={() => startPkceRedirect(pkceEntry, opds.getOrigin(), attemptedUrl, attemptedIntent)}
				>
					Sign in
				</button>
			</div>
		{:else if passwordBased()}
			{#key passwordBased()}
				<form
					class="login-form"
					on:submit|preventDefault={() =>
						submitForm(getAuthEndpoint(passwordBased()))}
				>
					{#if errorMessage}
						<p role="alert" class="error-text">{errorMessage}</p>
					{/if}

					<div class="text-field">
						<label for="username">
							{passwordBased()?.labels?.login || "Username"}
						</label>
						<input
							id="username"
							type="text"
							bind:value={credentials.username}
							required
						/>
					</div>

					<div class="text-field">
						<label for="password">
							{passwordBased()?.labels?.password || "Password"}
						</label>
						<input
							id="password"
							type="number"
							bind:value={credentials.password}
							required
						/>
					</div>

					<button
						class="small acquisition raised"
						type="submit"
						aria-busy={submitState === "loading"}
					>
						Sign In
					</button>
				</form>
			{/key}
		{:else if implicitEntry}
			{#each implicitLinks as option}
				<div class="login-form">
					{#if errorMessage}
						<p role="alert" class="error-text">{errorMessage}</p>
					{/if}
					<a
						type="button"
						role="button"
						class="small acquisition raised"
						aria-busy={attemptingAction}
						href={buildImplicitRedirectUrl(option.href, opds.getOrigin(), attemptedUrl, attemptedIntent)}
					>
						Sign in
					</a>
				</div>
			{/each}
		{/if}
	</section>
</main>

<style>
	.auth-container {
		display: flex;
		flex-direction: column;
		margin-bottom: var(--margin-end);
	}
	.auth-card {
		display: flex;
		flex-direction: column;
		gap: var(--gap-small);
		max-width: var(--container-sm);
		width: 100%;
		padding: var(--gap-medium);
		background-color: var(--bg-card);
		border-radius: var(--border-radius-big-card);
		margin: 0 auto;
	}
	.auth-header {
		display: flex;
		flex-direction: column;
		gap: var(--gap-tiny);
	}
	.auth-desc {
		color: var(--text-subtle);
	}
	input[type="number"],
	input[type="email"],
	input[type="text"] {
		appearance: textfield;
		-moz-appearance: textfield;
		padding: var(--gap-small);
		font-size: 1rem;
		background-color: var(--bg-card-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-button);
	}
	.login-form {
		display: flex;
		flex-direction: column;
		gap: var(--gap-small);
	}
	.text-field {
		display: flex;
		flex-direction: column;
		gap: var(--gap-xxsmall);
	}
</style>
