type FilterRules = {
	cid?: number;
	callsign?: string;
	limit?: number;
	page?: number;
	sort?: string;
	order?: string;
};

const API_URL = 'https://flight-plan-manager.zid-internal.com/v1/flight-plans';

export async function fetchFlightPlans(filter: FilterRules) {
	const queryParams = new URLSearchParams();
	if (filter.cid) queryParams.set('cid', filter.cid.toString());
	if (filter.callsign) queryParams.set('callsign', filter.callsign);
	if (filter.limit) queryParams.set('limit', filter.limit.toString());
	if (filter.page) queryParams.set('page', filter.page.toString());

	const response = await fetch(`${API_URL}?${queryParams.toString()}`, {
		method: 'GET'
	}).then((res) => res.json());

	return response;
}
