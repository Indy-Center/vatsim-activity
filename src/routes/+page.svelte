<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	// State variables
	let activeFlightPlans = $state(0);
	let totalFlightPlans = $state(0);
	let isLoading = $state(true);

	// Fetch dashboard stats
	async function fetchStats() {
		isLoading = true;
		try {
			// In a real implementation, this would fetch from an API
			// For now, we'll use mock data
			const response = await fetch('/api/flight_plans?limit=1');
			const data = await response.json();

			// Just to show we connected to the API
			totalFlightPlans = data.length > 0 ? 156 : 0;
			activeFlightPlans = 42;
		} catch (error) {
			console.error('Error fetching stats:', error);
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		await fetchStats();
	});

	// Dashboard cards data
	const dashboardCards = [
		{
			title: 'Flight Plans',
			description: 'Search and view flight plans filed by pilots',
			icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
			link: '/flight_plans',
			color: 'bg-indigo-500'
		},
		{
			title: 'Online Activity',
			description: 'View current online controllers and pilots',
			icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
			link: '#',
			color: 'bg-emerald-500',
			comingSoon: true
		},
		{
			title: 'Controller Stats',
			description: 'View controller activity and statistics',
			icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
			link: '#',
			color: 'bg-cyan-600',
			comingSoon: true
		},
		{
			title: 'Event Calendar',
			description: 'View upcoming VATSIM events and activities',
			icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
			link: '#',
			color: 'bg-amber-500',
			comingSoon: true
		}
	];
</script>

<div class="text-zinc-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="text-4xl font-bold text-white">VATSIM Activity</h1>
			<p class="mt-2 text-lg text-zinc-400">Monitor and analyze VATSIM network activity</p>
			<div class="mx-auto mt-3 max-w-2xl rounded-md bg-amber-500/20 p-3 text-sm text-amber-300">
				<strong>Note:</strong> This application is a work in progress. Statistics shown are for demonstration
				purposes only and do not reflect actual VATSIM data.
			</div>
		</div>

		<!-- Stats Overview -->
		<div class="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div
				class="border-l-4 border-indigo-500 bg-zinc-800 p-6"
				in:fade={{ duration: 300, delay: 100 }}
			>
				<div class="flex items-center">
					<div class="mr-4 rounded-full bg-indigo-500/20 p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 text-indigo-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<div class="text-sm text-zinc-400">Active Flight Plans</div>
						{#if isLoading}
							<div class="h-6 w-16 animate-pulse bg-zinc-700"></div>
						{:else}
							<div class="text-2xl font-bold text-white">{activeFlightPlans}</div>
						{/if}
					</div>
				</div>
			</div>

			<div
				class="border-l-4 border-cyan-600 bg-zinc-800 p-6"
				in:fade={{ duration: 300, delay: 200 }}
			>
				<div class="flex items-center">
					<div class="mr-4 rounded-full bg-cyan-600/20 p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 text-cyan-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
					</div>
					<div>
						<div class="text-sm text-zinc-400">Total Flight Plans</div>
						{#if isLoading}
							<div class="h-6 w-16 animate-pulse bg-zinc-700"></div>
						{:else}
							<div class="text-2xl font-bold text-white">{totalFlightPlans}</div>
						{/if}
					</div>
				</div>
			</div>

			<div
				class="border-l-4 border-emerald-500 bg-zinc-800 p-6"
				in:fade={{ duration: 300, delay: 300 }}
			>
				<div class="flex items-center">
					<div class="mr-4 rounded-full bg-emerald-500/20 p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 text-emerald-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>
					<div>
						<div class="text-sm text-zinc-400">Online Controllers</div>
						{#if isLoading}
							<div class="h-6 w-16 animate-pulse bg-zinc-700"></div>
						{:else}
							<div class="text-2xl font-bold text-white">Coming Soon</div>
						{/if}
					</div>
				</div>
			</div>

			<div
				class="border-l-4 border-amber-500 bg-zinc-800 p-6"
				in:fade={{ duration: 300, delay: 400 }}
			>
				<div class="flex items-center">
					<div class="mr-4 rounded-full bg-amber-500/20 p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 text-amber-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<div class="text-sm text-zinc-400">Upcoming Events</div>
						{#if isLoading}
							<div class="h-6 w-16 animate-pulse bg-zinc-700"></div>
						{:else}
							<div class="text-2xl font-bold text-white">Coming Soon</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Main Dashboard Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each dashboardCards as card, index}
				<div
					class="flex flex-col bg-zinc-800 transition-transform hover:scale-[1.02]"
					in:fade={{ duration: 300, delay: 100 * (index + 1) }}
				>
					<div class={`${card.color} p-4`}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-8 w-8 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={card.icon} />
						</svg>
					</div>
					<div class="flex flex-1 flex-col p-6">
						<h3 class="mb-2 text-xl font-bold text-white">{card.title}</h3>
						<p class="mb-4 flex-1 text-sm text-zinc-400">{card.description}</p>
						<div>
							{#if card.comingSoon}
								<div class="inline-block bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300">
									Coming Soon
								</div>
							{:else}
								<a
									href={card.link}
									class={`inline-block px-4 py-2 text-sm font-medium text-white ${card.color}`}
								>
									View {card.title}
								</a>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
