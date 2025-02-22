<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	type VatsimRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

	interface ControllerData {
		cid: number;
		name: string;
		callsign: string;
		frequency: string;
		facility: number;
		rating: VatsimRating;
		server: string;
		visual_range: number;
		text_atis: string | null;
		last_updated: string;
		logon_time: string;
	}

	interface ControllerEvent {
		type: 'connect' | 'disconnect';
		data: ControllerData;
		timestamp: number;
	}

	const props = $props<{
		data: {
			controllers: ControllerData[];
			airports: string[];
			stats: {
				connected_clients: number;
				unique_users: number;
			};
		};
	}>();

	// Initialize state
	const initialControllers = new Map<string, ControllerData>(
		props.data.controllers.map((controller: ControllerData) => [controller.callsign, controller])
	);
	let activeControllers = $state(initialControllers);

	// Create a Set of valid facility prefixes
	const initialPrefixes = new Set(['ZID', ...props.data.airports]);
	let validPrefixes = $state(initialPrefixes);

	let events = $state<ControllerEvent[]>([]);
	let eventSource: EventSource | null = null;
	let status = $state('Connecting...');
	let totalEvents = $state(0);
	let uniqueUsers = $state(props.data.stats.unique_users);
	let searchQuery = $state('');

	// Add a current time state that updates every second
	let currentTime = $state(Date.now());

	function isValidRating(rating: number): rating is VatsimRating {
		return rating >= 1 && rating <= 12;
	}

	function getRegionFromCallsign(callsign: string): string {
		const prefix = callsign.split('_')[0];
		// Common VATSIM regions
		const regions: Record<string, string> = {
			L: 'Europe',
			E: 'Europe',
			K: 'USA',
			P: 'Pacific',
			R: 'Asia',
			V: 'Oceania',
			Y: 'Australia',
			Z: 'Asia',
			C: 'Canada',
			T: 'Caribbean'
		};
		return regions[prefix[0]] || 'Other';
	}

	function getUniqueRegions(): string[] {
		const regions = new Set<string>();
		for (const controller of activeControllers.values()) {
			regions.add(getRegionFromCallsign(controller.callsign));
		}
		return Array.from(regions).sort();
	}

	function getFilteredControllers(): ControllerData[] {
		const query = searchQuery.toLowerCase();
		return Array.from(activeControllers.values())
			.filter(
				(controller) =>
					controller.callsign.toLowerCase().includes(query) ||
					controller.name.toLowerCase().includes(query) ||
					controller.frequency.includes(query)
			)
			.sort((a, b) => a.callsign.localeCompare(b.callsign));
	}

	function getFacilityPrefix(controller: ControllerData): string {
		const parts = controller.callsign.split('_');
		return parts[0];
	}

	function getPositionSuffix(controller: ControllerData): string {
		const parts = controller.callsign.split('_');
		const suffix = parts[parts.length - 1];

		switch (suffix) {
			case 'TWR':
				return 'Tower';
			case 'GND':
				return 'Ground';
			case 'DEL':
				return 'Delivery';
			case 'APP':
				return 'Approach';
			case 'DEP':
				return 'Departure';
			case 'CTR':
				return 'Center';
			case 'FSS':
				return 'Flight Service';
			default:
				return suffix;
		}
	}

	function getGroupedControllers(controllers: ControllerData[]): Map<string, ControllerData[]> {
		const groups = new Map<string, ControllerData[]>();

		for (const controller of controllers) {
			const facilityPrefix = getFacilityPrefix(controller);
			if (!groups.has(facilityPrefix)) {
				groups.set(facilityPrefix, []);
			}
			groups.get(facilityPrefix)?.push(controller);
		}

		// Sort controllers within each group by position type
		for (const controllers of groups.values()) {
			controllers.sort((a, b) => {
				// First sort by the last part of the callsign (position type)
				const aPosition = a.callsign.split('_').pop() || '';
				const bPosition = b.callsign.split('_').pop() || '';
				return aPosition.localeCompare(bPosition);
			});
		}

		// Sort groups by size (most controllers first)
		return new Map([...groups.entries()].sort((a, b) => b[1].length - a[1].length));
	}

	const filteredControllers = $derived(getFilteredControllers());
	const groupedControllers = $derived(getGroupedControllers(filteredControllers));
	const uniqueRegions = $derived(getUniqueRegions());

	function getRatingText(rating: VatsimRating): string {
		const ratings = {
			1: 'OBS',
			2: 'S1',
			3: 'S2',
			4: 'S3',
			5: 'C1',
			6: 'C2',
			7: 'C3',
			8: 'I1',
			9: 'I2',
			10: 'I3',
			11: 'SUP',
			12: 'ADM'
		};
		return ratings[rating] || 'Unknown';
	}

	function getRatingColor(rating: VatsimRating): string {
		const colors = {
			1: 'bg-gray-500', // OBS
			2: 'bg-green-500', // S1
			3: 'bg-green-600', // S2
			4: 'bg-green-700', // S3
			5: 'bg-yellow-500', // C1
			6: 'bg-yellow-600', // C2
			7: 'bg-yellow-700', // C3
			8: 'bg-blue-500', // I1
			9: 'bg-blue-600', // I2
			10: 'bg-blue-700', // I3
			11: 'bg-purple-500', // SUP
			12: 'bg-red-500' // ADM
		};
		return colors[rating] || 'bg-gray-500';
	}

	function connect() {
		eventSource = new EventSource('/api/events');

		eventSource.onopen = () => {
			status = 'Connected';
		};

		eventSource.onerror = () => {
			status = 'Disconnected';
			eventSource?.close();
			setTimeout(connect, 1000);
		};

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				const content = JSON.parse(data.content);

				// Validate the event data structure
				if (!content.event || !content.data || !content.timestamp) {
					return;
				}

				// Ensure the controller data has required fields
				if (!content.data.callsign || !content.data.rating || !isValidRating(content.data.rating)) {
					return;
				}

				// Filter out OBS and 199.998 frequency
				if (
					content.data.rating === 1 ||
					content.data.frequency === '199.998' ||
					content.data.callsign.includes('_OBS')
				) {
					return;
				}

				const newEvent: ControllerEvent = {
					type: content.event as 'connect' | 'disconnect',
					data: {
						...content.data,
						rating: content.data.rating as VatsimRating
					},
					timestamp: content.timestamp
				};

				events = [newEvent, ...events.slice(0, 49)];
				totalEvents++;

				if (newEvent.type === 'connect') {
					activeControllers = new Map(activeControllers).set(newEvent.data.callsign, newEvent.data);
				} else {
					const updatedControllers = new Map(activeControllers);
					updatedControllers.delete(newEvent.data.callsign);
					activeControllers = updatedControllers;
				}
			} catch (error) {
				// Silently handle parsing errors
			}
		};
	}

	// Update timeAgo to be derived from currentTime
	const timeAgo = $derived((timestamp: number) => {
		const seconds = Math.floor((currentTime - timestamp) / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days === 1) return '1 day ago';
		if (days < 7) return `${days} days ago`;
		return new Date(timestamp).toLocaleDateString();
	});

	onMount(() => {
		connect();
		const interval = setInterval(() => {
			currentTime = Date.now();
		}, 1000);

		return () => clearInterval(interval);
	});

	onDestroy(() => {
		eventSource?.close();
	});

	const activeControllerCount = $derived(activeControllers.size);
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 text-white">
	<div class="mx-auto max-w-7xl">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold tracking-tight">VATSIM Activity</h1>
				<div class="mt-2 flex items-center gap-3">
					<div class="flex items-center gap-2">
						<div
							class="h-3 w-3 rounded-full {status === 'Connected'
								? 'animate-pulse bg-green-500'
								: 'bg-red-500'}"
						></div>
						<span class="text-sm font-medium">{status}</span>
					</div>
					<div class="h-4 w-px bg-gray-700"></div>
					<div class="text-sm font-medium">
						<span class="text-green-400">{activeControllerCount}</span> active controllers
					</div>
					<div class="h-4 w-px bg-gray-700"></div>
					<div class="text-sm font-medium">
						<span class="text-blue-400">{totalEvents}</span> events tracked
					</div>
					<div class="h-4 w-px bg-gray-700"></div>
					<div class="text-sm font-medium">
						<span class="text-purple-400">{uniqueUsers}</span> unique users
					</div>
				</div>
			</div>
			<div class="text-right text-sm text-gray-400">
				Last update: {new Date().toLocaleTimeString()}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<div class="lg:col-span-2">
				<div class="mb-4 space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-semibold">Active Controllers</h2>
						<div class="relative">
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Search controllers..."
								class="rounded-lg bg-gray-800/50 px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
					</div>
				</div>
				<div class="grid gap-2">
					{#if filteredControllers.length === 0}
						<div class="rounded-lg bg-gray-800/30 p-6 text-center">
							{#if searchQuery}
								<p class="text-gray-400">No controllers found matching "{searchQuery}"</p>
							{:else if activeControllers.size === 0}
								<div class="flex flex-col items-center gap-3">
									<div
										class="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500"
									></div>
									<p class="text-gray-400">Loading controllers...</p>
								</div>
							{:else}
								<p class="text-gray-400">No active controllers</p>
							{/if}
						</div>
					{/if}

					{#each [...groupedControllers] as [facilityPrefix, controllers]}
						<div class="mb-6">
							<h3 class="mb-3 text-lg font-semibold text-gray-300">
								{facilityPrefix}
								<span class="ml-2 text-sm text-gray-500">({controllers.length} positions)</span>
							</h3>
							<div class="grid gap-2">
								{#each controllers as controller (controller.callsign)}
									<div
										in:fade={{ duration: 200 }}
										class="group relative overflow-hidden rounded-lg bg-gray-800/30 p-3 transition-all hover:bg-gray-800/50"
									>
										<div class="flex items-center gap-3">
											<div class="flex-1">
												<div class="flex items-baseline gap-2">
													<span class="font-mono text-lg font-medium">{controller.callsign}</span>
													<span
														class="rounded px-1.5 py-0.5 text-xs font-medium {getRatingColor(
															controller.rating
														)}"
													>
														{getRatingText(controller.rating)}
													</span>
													<span class="text-sm text-gray-500">{getPositionSuffix(controller)}</span>
												</div>
												<div class="mt-1 flex gap-4 text-sm text-gray-400">
													<span>{controller.name}</span>
													<span>{controller.frequency}</span>
													<span>{controller.server}</span>
												</div>
												{#if controller.text_atis}
													<div class="mt-2 rounded bg-gray-900/50 p-2 text-sm text-gray-300">
														<div class="font-medium text-gray-400">ATIS</div>
														<div class="font-mono whitespace-pre-wrap">{controller.text_atis}</div>
													</div>
												{/if}
											</div>
											<div class="text-right text-sm text-gray-500">
												<div>Range: {controller.visual_range}nm</div>
												<div>CID: {controller.cid}</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="rounded-lg bg-gray-800/20 p-4">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold">Live Events</h2>
					<button
						class="rounded bg-gray-700 px-2 py-1 text-sm hover:bg-gray-600"
						onclick={() => (events = [])}
					>
						Clear
					</button>
				</div>
				<div class="space-y-2">
					{#each events as event (event.data.callsign + event.timestamp)}
						<div
							in:fly={{ y: 20, duration: 300, easing: quintOut }}
							class="flex items-center gap-2 rounded bg-gray-800/30 px-3 py-2 text-sm"
						>
							<div
								class="h-2 w-2 rounded-full {event.type === 'connect'
									? 'bg-green-500'
									: 'bg-red-500'}"
							></div>
							<span class="font-medium">{event.data.callsign}</span>
							<span class="text-gray-400">
								{event.type === 'connect' ? 'connected' : 'disconnected'}
							</span>
							<span class="ml-auto text-xs text-gray-500">{timeAgo(event.timestamp)}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
