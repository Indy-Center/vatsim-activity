<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	// State variables
	let flightPlans = $state<any[]>([]);
	let filteredPlans = $state<any[]>([]);
	let isLoading = $state(true);
	let filterStatus = $state('');
	let searchQuery = $state('');
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	let displayedPlans = $state<any[]>([]);
	let initialLoadComplete = $state(false);
	let searchTimeout: number | undefined;

	// API base URL
	const API_URL = '/api/flight_plans';

	// Load saved search params from localStorage
	function loadSavedSearch() {
		if (browser) {
			const savedSearch = localStorage.getItem('flightPlanSearch');
			const savedStatus = localStorage.getItem('flightPlanStatus');
			const savedPage = localStorage.getItem('flightPlanPage');

			if (savedSearch) searchQuery = savedSearch;
			if (savedStatus) filterStatus = savedStatus;
			if (savedPage) {
				const page = parseInt(savedPage, 10);
				if (!isNaN(page) && page > 0) {
					currentPage = page;
				}
			}
		}
	}

	// Save search params to localStorage
	function saveSearch() {
		if (browser) {
			localStorage.setItem('flightPlanSearch', searchQuery);
			localStorage.setItem('flightPlanStatus', filterStatus);
			localStorage.setItem('flightPlanPage', currentPage.toString());
		}
	}

	// Capitalize callsign for consistency
	function capitalizeCallsign(callsign: string): string {
		return callsign.trim().toUpperCase();
	}

	onMount(async () => {
		loadSavedSearch();
		await fetchFlightPlans();
		initialLoadComplete = true;
	});

	async function fetchFlightPlans() {
		isLoading = true;

		try {
			const params = new URLSearchParams();
			// Always fetch a large number of flight plans
			params.append('limit', '2000');

			// Fetch data
			const response = await fetch(`${API_URL}?${params.toString()}`);
			const data = await response.json();

			// Process flight plans
			flightPlans = data;
			applyFilters();
		} catch (error) {
			console.error('Error fetching flight plans:', error);
			flightPlans = [];
			filteredPlans = [];
			displayedPlans = [];
		} finally {
			isLoading = false;
		}
	}

	function applyFilters() {
		// Apply client-side filtering
		filteredPlans = flightPlans.filter((plan) => {
			// Status filter
			const statusMatch = !filterStatus || plan.status.toLowerCase() === filterStatus.toLowerCase();

			// Search query filter (case insensitive)
			const query = searchQuery.trim().toUpperCase();
			const searchMatch =
				!query ||
				plan.callsign.includes(query) ||
				plan.cid.toString().includes(query) ||
				(plan.departure && plan.departure.includes(query));

			return statusMatch && searchMatch;
		});

		// Calculate total pages
		totalPages = Math.max(1, Math.ceil(filteredPlans.length / itemsPerPage));

		// Ensure current page is valid
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}

		// Update displayed plans
		updateDisplayedPlans();

		// Save search state after applying filters
		saveSearch();
	}

	function updateDisplayedPlans() {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		displayedPlans = filteredPlans.slice(startIndex, endIndex);
	}

	function getStatusColor(status: string) {
		switch (status?.toLowerCase()) {
			case 'active':
				return 'bg-indigo-500';
			case 'expired':
				return 'bg-zinc-600';
			default:
				return 'bg-cyan-600';
		}
	}

	function clearFilters() {
		filterStatus = '';
		searchQuery = '';
		currentPage = 1;
		applyFilters();
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	function formatTime(dateString: string) {
		return new Date(dateString).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleSearch() {
		currentPage = 1;
		applyFilters();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
				searchTimeout = undefined;
			}
			handleSearch();
		}
	}

	// Auto-capitalize input as user types with debounce
	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const start = input.selectionStart || 0;
		const end = input.selectionEnd || 0;

		// Only capitalize if there's actual content
		if (input.value) {
			const newValue = input.value.toUpperCase();

			// Only update if the value would actually change
			if (newValue !== input.value) {
				input.value = newValue;
				searchQuery = newValue;

				// Restore cursor position
				input.setSelectionRange(start, end);
			} else {
				searchQuery = newValue;
			}
		} else {
			searchQuery = '';
		}

		// Debounce search to prevent excessive updates
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			handleSearch();
			searchTimeout = undefined;
		}, 300) as unknown as number;
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			updateDisplayedPlans();
			saveSearch(); // Save state when changing pages
		}
	}

	function setFilterStatus(status: string) {
		filterStatus = filterStatus === status ? '' : status;
		currentPage = 1;
		applyFilters();
	}
</script>

<div class="text-zinc-100">
	<div class="container mx-auto px-4 py-6">
		<!-- Header -->
		<div class="mb-6">
			<h1 class="mb-4 text-3xl font-bold text-white">Flight Plans</h1>

			<!-- Full-width search box -->
			<div class="relative mb-4">
				<input
					type="text"
					placeholder="Search by Callsign, CID, or Departure..."
					bind:value={searchQuery}
					on:input={handleInput}
					on:keydown={handleKeyDown}
					class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-3 text-white uppercase placeholder-zinc-400 focus:border-indigo-500 focus:outline-none"
				/>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="absolute top-3 right-4 h-5 w-5 text-zinc-400"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>

			<!-- Status filter buttons -->
			<div class="mb-4 flex items-center space-x-3">
				<span class="text-sm text-zinc-400">Status:</span>
				<button
					on:click={() => setFilterStatus('active')}
					class={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
						filterStatus === 'active'
							? 'bg-indigo-500 text-white'
							: 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
					}`}
				>
					Active
				</button>
				<button
					on:click={() => setFilterStatus('expired')}
					class={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
						filterStatus === 'expired'
							? 'bg-zinc-500 text-white'
							: 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
					}`}
				>
					Expired
				</button>
				<button
					on:click={clearFilters}
					class="ml-auto rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
				>
					Clear All
				</button>
			</div>
		</div>

		{#if isLoading}
			<div class="flex h-60 items-center justify-center">
				<div class="flex animate-pulse space-x-4">
					<div class="h-12 w-12 bg-zinc-700"></div>
					<div class="flex-1 space-y-6 py-1">
						<div class="h-2 bg-zinc-700"></div>
						<div class="space-y-3">
							<div class="grid grid-cols-3 gap-4">
								<div class="col-span-2 h-2 bg-zinc-700"></div>
								<div class="col-span-1 h-2 bg-zinc-700"></div>
							</div>
							<div class="h-2 bg-zinc-700"></div>
						</div>
					</div>
				</div>
			</div>
		{:else if filteredPlans.length === 0}
			<div
				class="flex h-60 items-center justify-center rounded-lg border-l-4 border-amber-500 bg-zinc-800 p-6"
			>
				<div class="text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mx-auto h-12 w-12 text-amber-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="mt-2 text-lg font-medium text-zinc-300">No flight plans found</p>
					<p class="text-zinc-400">Try adjusting your filters or search for a different callsign</p>
				</div>
			</div>
		{:else}
			<!-- Flight Plans Grid -->
			<div class="mb-6">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each displayedPlans as flightPlan, index}
						<div
							class="rounded-lg bg-zinc-800 p-4 shadow-md transition-transform hover:scale-[1.02]"
							in:fade={{ duration: 200, delay: index * 30 }}
						>
							<div class="mb-3 flex items-center justify-between">
								<div class="flex items-center space-x-2">
									<div
										class={`inline-block px-2 py-1 text-xs font-medium text-white ${getStatusColor(
											flightPlan.status
										)}`}
									>
										{flightPlan.status}
									</div>
									<h3 class="text-lg font-bold text-white">{flightPlan.callsign}</h3>
								</div>
								<a
									href={`/flight_plans/${flightPlan.id}`}
									class="inline-block rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
								>
									View
								</a>
							</div>

							<div class="mb-3">
								<div class="rounded bg-zinc-900 p-2">
									<div class="text-xs text-zinc-400">Departure</div>
									<div class="text-sm font-medium text-white">{flightPlan.departure || 'N/A'}</div>
								</div>
							</div>

							<div class="mb-2 flex items-center space-x-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4 text-zinc-400"
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
								<div class="text-sm text-zinc-300">Pilot ID: {flightPlan.cid}</div>
							</div>

							<div class="flex items-center space-x-2 text-xs text-zinc-400">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
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
								<div>
									Filed: {formatTime(flightPlan.filed_at)}
									{formatDate(flightPlan.filed_at)}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="mt-6 flex items-center justify-center space-x-2">
					<button
						on:click={() => goToPage(1)}
						class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white disabled:opacity-50"
						disabled={currentPage === 1}
					>
						First
					</button>
					<button
						on:click={() => goToPage(currentPage - 1)}
						class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white disabled:opacity-50"
						disabled={currentPage === 1}
					>
						Prev
					</button>

					<div class="px-3 py-1 text-sm text-zinc-300">
						Page {currentPage} of {totalPages}
					</div>

					<button
						on:click={() => goToPage(currentPage + 1)}
						class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white disabled:opacity-50"
						disabled={currentPage === totalPages}
					>
						Next
					</button>
					<button
						on:click={() => goToPage(totalPages)}
						class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white disabled:opacity-50"
						disabled={currentPage === totalPages}
					>
						Last
					</button>
				</div>
			{/if}

			<!-- Results summary -->
			<div class="mt-4 text-center text-sm text-zinc-400">
				Showing {filteredPlans.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(
					currentPage * itemsPerPage,
					filteredPlans.length
				)} of {filteredPlans.length} flight plans
			</div>
		{/if}
	</div>
</div>
