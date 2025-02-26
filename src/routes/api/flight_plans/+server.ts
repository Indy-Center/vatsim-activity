import { fetchFlightPlans } from '$lib/flightPlanManagerClient';
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
	const flightPlans = await fetchFlightPlans({
		...Object.fromEntries(url.searchParams.entries())
	});

	return json(flightPlans);
}
