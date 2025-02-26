import { json } from '@sveltejs/kit';

const API_URL = 'https://flight-plan-manager.zid-internal.com/v1/flight-plans';

export async function GET({ params }) {
	try {
		const { id } = params;

		// Fetch the flight plan from the external API
		const response = await fetch(`${API_URL}/${id}`);

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Flight plan not found' }), {
				status: response.status,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}

		const flightPlan = await response.json();
		return json(flightPlan);
	} catch (error) {
		console.error('Error fetching flight plan:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch flight plan' }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
