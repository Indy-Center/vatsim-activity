import type { PageServerLoad } from './$types';

type VatsimRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface VatsimController {
	cid: number;
	name: string;
	callsign: string;
	frequency: string;
	facility: number;
	rating: number; // Raw rating from API
	server: string;
	visual_range: number;
	text_atis: string | null;
	logon_time: string;
	last_updated: string;
}

interface VatsimData {
	general: {
		version: number;
		connected_clients: number;
		unique_users: number;
	};
	controllers: VatsimController[];
}

interface ZidAirport {
	arpt_id: string;
	icao_id: string;
	state_code: string;
	city: string;
	arpt_name: string;
	resp_artcc_id: string;
	arpt_status: string;
	twr_type_code: string;
}

function isValidRating(rating: number): rating is VatsimRating {
	return rating >= 1 && rating <= 12;
}

export const load: PageServerLoad = async () => {
	try {
		const response = await fetch('https://data.vatsim.net/v3/vatsim-data.json');

		if (!response.ok) {
			throw new Error(`Failed to fetch VATSIM data: ${response.statusText}`);
		}

		const data: VatsimData = await response.json();

		console.log('Fetched VATSIM data:', {
			controllers: data.controllers?.length ?? 0,
			clients: data.general?.connected_clients ?? 0
		});

		// Filter and transform controllers data
		const activeControllers = (data.controllers ?? [])
			.filter((controller) => {
				// Ensure we have valid data
				if (
					!controller ||
					!controller.callsign ||
					!controller.rating ||
					!isValidRating(controller.rating)
				) {
					return false;
				}

				// Filter out OBS ratings, 199.998 frequency, and _OBS positions
				if (
					controller.rating === 1 ||
					controller.frequency === '199.998' ||
					controller.callsign.includes('_OBS')
				) {
					return false;
				}

				return true;
			})
			.map((controller) => ({
				cid: controller.cid,
				name: controller.name,
				callsign: controller.callsign,
				frequency: controller.frequency,
				facility: controller.facility,
				rating: controller.rating as VatsimRating, // Safe because of filter
				server: controller.server,
				visual_range: controller.visual_range,
				text_atis: controller.text_atis,
				last_updated: controller.last_updated,
				logon_time: controller.logon_time
			}));

		console.log('Processed controllers:', activeControllers.length);

		return {
			controllers: activeControllers,
			airports: [],
			stats: {
				connected_clients: data.general?.connected_clients ?? 0,
				unique_users: data.general?.unique_users ?? 0
			}
		};
	} catch (error) {
		console.error('Failed to fetch data:', error);
		return {
			controllers: [],
			airports: [],
			stats: {
				connected_clients: 0,
				unique_users: 0
			}
		};
	}
};
