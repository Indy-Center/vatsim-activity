<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();

	// Navigation items
	const navItems = [
		{
			name: 'Dashboard',
			href: '/',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		},
		{ name: 'Flight Plans', href: '/flight_plans', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
		{
			name: 'Online Activity',
			href: '#',
			icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
			disabled: true
		},
		{
			name: 'Events',
			href: '#',
			icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
			disabled: true
		}
	];

	// Toggle mobile menu
	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<div class="min-h-screen bg-zinc-900">
	<!-- Navigation -->
	<nav class="border-b border-zinc-800 bg-zinc-900">
		<div class="container mx-auto px-4">
			<div class="flex h-16 items-center justify-between">
				<!-- Desktop navigation -->
				<div class="flex items-center">
					<div class="hidden md:block">
						<div class="flex items-center space-x-4">
							{#each navItems as item}
								{#if item.disabled}
									<span
										class="cursor-not-allowed px-3 py-2 text-sm font-medium text-zinc-500"
										title="Coming Soon"
									>
										{item.name}
									</span>
								{:else}
									<a
										href={item.href}
										class={`px-3 py-2 text-sm font-medium transition-colors ${
											$page.url.pathname === item.href ||
											($page.url.pathname.startsWith(item.href) && item.href !== '/')
												? 'text-indigo-400'
												: 'text-zinc-300 hover:text-white'
										}`}
									>
										{item.name}
									</a>
								{/if}
							{/each}
						</div>
					</div>
				</div>

				<!-- Mobile menu button -->
				<div class="flex md:hidden">
					<button
						on:click={toggleMobileMenu}
						type="button"
						class="inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white focus:outline-none"
						aria-controls="mobile-menu"
						aria-expanded="false"
					>
						<span class="sr-only">Open main menu</span>
						{#if mobileMenuOpen}
							<svg
								class="h-6 w-6"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						{:else}
							<svg
								class="h-6 w-6"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Mobile menu -->
		{#if mobileMenuOpen}
			<div class="md:hidden" id="mobile-menu">
				<div class="space-y-1 px-2 pt-2 pb-3">
					{#each navItems as item}
						{#if item.disabled}
							<span
								class="block cursor-not-allowed px-3 py-2 text-base font-medium text-zinc-500"
								title="Coming Soon"
							>
								{item.name}
							</span>
						{:else}
							<a
								href={item.href}
								class={`block px-3 py-2 text-base font-medium ${
									$page.url.pathname === item.href ||
									($page.url.pathname.startsWith(item.href) && item.href !== '/')
										? 'bg-zinc-800 text-indigo-400'
										: 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
								}`}
							>
								{item.name}
							</a>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</nav>

	<!-- Main content -->
	<main>
		{@render children()}
	</main>
</div>
