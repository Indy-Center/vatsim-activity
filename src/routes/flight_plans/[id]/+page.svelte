<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly } from 'svelte/transition';

	// Define types
	interface FlightPlanRevision {
		id: string;
		flight_plan_id: string;
		flight_plan: Record<string, any>;
		revision: number;
		created_at: string;
	}

	interface FlightPlan {
		id: string;
		cid: number;
		callsign: string;
		status: string;
		created_at: string;
		expired_at: string | null;
		departure: string;
		arrival?: string;
		filed_at: string;
		flight_plan: Record<string, any>;
		revisions: FlightPlanRevision[];
	}

	// State variables
	let flightPlan = $state<FlightPlan | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let activeTab = $state('details');
	let activeRevision = $state<number | null>(null);
	let sortedRevisions = $state<FlightPlanRevision[]>([]);

	onMount(async () => {
		await fetchFlightPlan();
	});

	async function fetchFlightPlan() {
		isLoading = true;
		error = null;

		try {
			const id = $page.params.id;
			const response = await fetch(`/api/flight_plans/${id}`);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch flight plan');
			}

			flightPlan = await response.json();

			// Sort revisions by revision number (descending - newest first)
			if (flightPlan && flightPlan.revisions) {
				sortedRevisions = [...flightPlan.revisions].sort((a, b) => b.revision - a.revision);

				// Set the active revision to the newest one by default
				if (sortedRevisions.length > 0) {
					activeRevision = sortedRevisions[0].revision;
				}
			}
		} catch (err) {
			console.error('Error fetching flight plan:', err);
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
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

	function formatTime(timeString: string | undefined) {
		// Format time like "0445" to "04:45"
		if (timeString && timeString.length === 4) {
			return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
		}
		return timeString || 'N/A';
	}

	function formatDate(dateString: string | undefined) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString();
	}

	function getRevisionById(revisionId: number | null) {
		if (revisionId === null || !sortedRevisions.length) return null;
		return sortedRevisions.find((rev) => rev.revision === revisionId) || null;
	}

	function getActiveRevisionData() {
		if (activeRevision === null) return null;
		const revision = getRevisionById(activeRevision);
		return revision?.flight_plan || null;
	}

	function compareRevisions(rev1: FlightPlanRevision | null, rev2: FlightPlanRevision | null) {
		if (!rev1 || !rev2) return [];

		const differences = [];
		const fp1 = rev1.flight_plan;
		const fp2 = rev2.flight_plan;

		// Compare all fields
		for (const key in fp1) {
			if (fp1[key] !== fp2[key]) {
				differences.push({
					field: key,
					oldValue: fp2[key],
					newValue: fp1[key]
				});
			}
		}

		return differences;
	}
</script>

<div class="text-zinc-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Header with back button -->
		<div class="mb-6 flex items-center">
			<a
				href="/flight_plans"
				class="mr-4 flex items-center border-b border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-indigo-500 hover:bg-zinc-700"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mr-1 h-4 w-4"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
						clip-rule="evenodd"
					/>
				</svg>
				Back
			</a>
			<h1 class="text-2xl font-bold text-white">Flight Plan Details</h1>
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
		{:else if error}
			<div class="border-l-4 border-red-500 bg-zinc-800/80 p-6 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mx-auto h-12 w-12 text-red-500"
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
				<h2 class="mt-2 text-xl font-bold text-white">Error Loading Flight Plan</h2>
				<p class="mt-1 text-red-300">{error}</p>
				<button
					on:click={fetchFlightPlan}
					class="mt-4 border-b-2 border-red-500 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
				>
					Try Again
				</button>
			</div>
		{:else if flightPlan}
			<!-- Flight Plan Header -->
			<div class="mb-6 border-l-4 border-indigo-500 bg-zinc-800 p-6" in:fade={{ duration: 300 }}>
				<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
					<div>
						<div class="flex items-center gap-3">
							<h2 class="text-3xl font-bold text-white">{flightPlan.callsign}</h2>
							<div
								class={`px-3 py-1 text-sm font-medium text-white ${getStatusColor(flightPlan.status)}`}
							>
								{flightPlan.status}
							</div>
						</div>
						<div class="mt-2 flex items-center gap-2 text-lg">
							<span class="font-medium text-white">{flightPlan.departure}</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 text-zinc-400"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="font-medium text-white"
								>{flightPlan.flight_plan?.arrival || flightPlan.arrival || 'Unknown'}</span
							>
						</div>
					</div>
					<div class="flex flex-col items-end gap-1 text-sm text-zinc-300">
						<div>Pilot ID: <span class="font-medium text-white">{flightPlan.cid}</span></div>
						<div>
							Filed: <span class="font-medium text-white">{formatDate(flightPlan.filed_at)}</span>
						</div>
						{#if flightPlan.expired_at}
							<div>
								Expired: <span class="font-medium text-white"
									>{formatDate(flightPlan.expired_at)}</span
								>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Tabs -->
			<div class="mb-6 border-b border-zinc-700">
				<div class="flex space-x-6">
					<button
						class={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === 'details' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'}`}
						on:click={() => (activeTab = 'details')}
					>
						Flight Details
					</button>
					<button
						class={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === 'revisions' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'}`}
						on:click={() => (activeTab = 'revisions')}
					>
						Revisions ({sortedRevisions.length || 0})
					</button>
				</div>
			</div>

			<!-- Tab Content -->
			{#if activeTab === 'details'}
				<div in:fade={{ duration: 200 }}>
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<!-- Flight Information -->
						<div class="border-l-4 border-cyan-600 bg-zinc-800 p-6">
							<h3 class="mb-4 text-lg font-medium text-white">Flight Information</h3>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<div class="text-sm text-zinc-400">Aircraft</div>
									<div class="font-medium text-white">
										{flightPlan.flight_plan?.aircraft_short || 'N/A'}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Full Aircraft Type</div>
									<div class="font-medium text-white">
										{flightPlan.flight_plan?.aircraft || 'N/A'}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Departure Time</div>
									<div class="font-medium text-white">
										{formatTime(flightPlan.flight_plan?.deptime)}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Flight Rules</div>
									<div class="font-medium text-white">
										{flightPlan.flight_plan?.flight_rules || 'N/A'}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Cruise Speed</div>
									<div class="font-medium text-white">
										{flightPlan.flight_plan?.cruise_tas || 'N/A'}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Altitude</div>
									<div class="font-medium text-white">
										{flightPlan.flight_plan?.altitude || 'N/A'}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Enroute Time</div>
									<div class="font-medium text-white">
										{formatTime(flightPlan.flight_plan?.enroute_time)}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Fuel Time</div>
									<div class="font-medium text-white">
										{formatTime(flightPlan.flight_plan?.fuel_time)}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Alternate</div>
									<div class="font-medium text-white">
										{flightPlan.flight_plan?.alternate || 'N/A'}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Transponder</div>
									<div class="font-medium text-white">
										{flightPlan.flight_plan?.assigned_transponder || 'N/A'}
									</div>
								</div>
								<div>
									<div class="text-sm text-zinc-400">Revisions</div>
									<div class="font-medium text-white">
										{sortedRevisions.length}
									</div>
								</div>
							</div>
						</div>

						<!-- Route Information -->
						<div class="border-l-4 border-cyan-600 bg-zinc-800 p-6">
							<h3 class="mb-4 text-lg font-medium text-white">Route</h3>
							<div
								class="border-l-2 border-zinc-600 bg-zinc-900 p-4 font-mono text-sm text-zinc-300"
							>
								{flightPlan.flight_plan?.route || 'No route information available'}
							</div>

							<h3 class="mt-6 mb-2 text-lg font-medium text-white">Remarks</h3>
							<div
								class="border-l-2 border-zinc-600 bg-zinc-900 p-4 font-mono text-sm text-zinc-300"
							>
								{flightPlan.flight_plan?.remarks || 'No remarks available'}
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'revisions'}
				<div in:fade={{ duration: 200 }}>
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
						<!-- Revisions List -->
						<div class="border-l-4 border-indigo-500 bg-zinc-800 p-6">
							<h3 class="mb-4 text-lg font-medium text-white">Revision History</h3>
							<div class="flex flex-col gap-2">
								{#each sortedRevisions as revision}
									<button
										class={`flex items-center justify-between p-3 text-left transition-colors ${activeRevision === revision.revision ? 'border-l-2 border-indigo-500 bg-indigo-600 text-white' : 'border-l-2 border-zinc-600 bg-zinc-700 text-zinc-200 hover:bg-zinc-600'}`}
										on:click={() => (activeRevision = revision.revision)}
									>
										<div>
											<div class="font-medium">Revision #{revision.revision}</div>
											<div class="text-xs opacity-80">{formatDate(revision.created_at)}</div>
										</div>
										{#if revision.revision === flightPlan.flight_plan.revision_id}
											<div class="bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
												Current
											</div>
										{/if}
									</button>
								{/each}
							</div>
						</div>

						<!-- Revision Details -->
						<div class="lg:col-span-2">
							{#if activeRevision !== null}
								{@const revisionData = getActiveRevisionData()}
								{@const currentRevision = getRevisionById(activeRevision)}
								{@const prevRevisionIndex =
									sortedRevisions.findIndex((r) => r.revision === activeRevision) + 1}
								{@const prevRevision =
									prevRevisionIndex < sortedRevisions.length
										? sortedRevisions[prevRevisionIndex]
										: null}
								{@const differences = prevRevision
									? compareRevisions(currentRevision, prevRevision)
									: []}

								<div class="border-l-4 border-cyan-600 bg-zinc-800 p-6">
									<div class="mb-4 flex items-center justify-between">
										<h3 class="text-lg font-medium text-white">
											Revision #{activeRevision} Details
										</h3>
										<div class="text-sm text-zinc-400">
											{formatDate(currentRevision?.created_at || '')}
										</div>
									</div>

									{#if differences.length > 0}
										<div class="mb-6 border-l-4 border-amber-500 bg-zinc-800/80 p-4">
											<h4 class="mb-2 font-medium text-amber-300">
												Changes from Previous Revision
											</h4>
											<ul class="space-y-2 text-sm">
												{#each differences as diff}
													<li class="border-l-2 border-zinc-600 bg-zinc-700/50 p-2">
														<div class="font-medium text-white">{diff.field}</div>
														<div class="mt-1 grid grid-cols-2 gap-2 text-xs">
															<div>
																<div class="text-zinc-400">Previous</div>
																<div class="font-mono text-red-400">
																	{diff.oldValue || '(empty)'}
																</div>
															</div>
															<div>
																<div class="text-zinc-400">New</div>
																<div class="font-mono text-green-400">
																	{diff.newValue || '(empty)'}
																</div>
															</div>
														</div>
													</li>
												{/each}
											</ul>
										</div>
									{/if}

									<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div>
											<div class="text-sm text-zinc-400">Route</div>
											<div
												class="border-l-2 border-zinc-600 bg-zinc-900 p-3 font-mono text-sm text-zinc-300"
											>
												{revisionData?.route || 'N/A'}
											</div>
										</div>
										<div>
											<div class="text-sm text-zinc-400">Aircraft</div>
											<div class="font-medium text-white">
												{revisionData?.aircraft_short || 'N/A'}
											</div>
										</div>
										<div>
											<div class="text-sm text-zinc-400">Departure</div>
											<div class="font-medium text-white">{revisionData?.departure || 'N/A'}</div>
										</div>
										<div>
											<div class="text-sm text-zinc-400">Arrival</div>
											<div class="font-medium text-white">{revisionData?.arrival || 'N/A'}</div>
										</div>
										<div>
											<div class="text-sm text-zinc-400">Altitude</div>
											<div class="font-medium text-white">{revisionData?.altitude || 'N/A'}</div>
										</div>
										<div>
											<div class="text-sm text-zinc-400">Transponder</div>
											<div class="font-medium text-white">
												{revisionData?.assigned_transponder || 'N/A'}
											</div>
										</div>
									</div>
								</div>
							{:else}
								<div
									class="flex h-full items-center justify-center border-l-4 border-zinc-600 bg-zinc-800 p-6"
								>
									<p class="text-zinc-400">Select a revision to view details</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
