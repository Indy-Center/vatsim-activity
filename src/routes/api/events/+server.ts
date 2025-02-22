import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import amqp, { type Channel, type Connection, type ConsumeMessage } from 'amqplib';
import { env } from '$env/dynamic/private';

// Global connection and channel
let connection: Connection | undefined;
let channel: Channel | undefined;
let consumerTag: string | undefined;
let isShuttingDown = false;

// Event history buffer
const MAX_EVENTS = 50;
const eventHistory: { routingKey: string; content: string }[] = [];
const clients = new Set<ReadableStreamDefaultController>();

function addToHistory(routingKey: string, content: string) {
	eventHistory.unshift({ routingKey, content });
	if (eventHistory.length > MAX_EVENTS) {
		eventHistory.pop();
	}
}

function validateControllerData(data: any): boolean {
	return (
		data &&
		typeof data.cid === 'number' &&
		typeof data.name === 'string' &&
		typeof data.callsign === 'string' &&
		typeof data.frequency === 'string' &&
		typeof data.facility === 'number' &&
		typeof data.rating === 'number' &&
		typeof data.server === 'string' &&
		typeof data.visual_range === 'number'
	);
}

function broadcastToClients(data: any) {
	const message = `data: ${JSON.stringify(data)}\n\n`;
	const encoder = new TextEncoder();
	const chunk = encoder.encode(message);
	const closedClients = new Set<ReadableStreamDefaultController>();

	for (const client of clients) {
		try {
			client.enqueue(chunk);
		} catch (err) {
			closedClients.add(client);
		}
	}

	// Clean up closed clients
	for (const client of closedClients) {
		clients.delete(client);
	}
}

// Initialize RabbitMQ connection
async function initializeRabbitMQ() {
	if (channel || isShuttingDown) return;

	try {
		connection = await amqp.connect(env.RABBIT_URL);

		connection.on('error', (err) => {
			if (!isShuttingDown) {
				console.error('RabbitMQ connection error:', err);
				cleanup();
			}
		});

		connection.on('close', () => {
			if (!isShuttingDown) {
				console.error('RabbitMQ connection closed unexpectedly');
				cleanup();
			}
		});

		channel = await connection.createChannel();

		channel.on('error', (err) => {
			if (!isShuttingDown) {
				console.error('RabbitMQ channel error:', err);
				cleanup();
			}
		});

		channel.on('close', () => {
			if (!isShuttingDown) {
				console.error('RabbitMQ channel closed unexpectedly');
				cleanup();
			}
		});

		const exchange = 'vatsim.events';
		await channel.assertExchange(exchange, 'topic', { durable: true });

		const q = await channel.assertQueue('vatsim_events_shared', {
			durable: true
		});

		await channel.bindQueue(q.queue, exchange, 'events.controller.connect');
		await channel.bindQueue(q.queue, exchange, 'events.controller.disconnect');

		const consumer = await channel.consume(q.queue, (msg: ConsumeMessage | null) => {
			if (msg !== null && channel && !isShuttingDown) {
				try {
					const content = JSON.parse(msg.content.toString());

					// Validate the message content
					if (!content.event || !validateControllerData(content.data)) {
						channel.ack(msg);
						return;
					}

					const data = {
						routingKey: msg.fields.routingKey,
						content: JSON.stringify({
							event: content.event,
							data: content.data,
							timestamp: Date.now()
						})
					};

					// Add to history and broadcast to all clients
					addToHistory(data.routingKey, data.content);
					broadcastToClients(data);
					channel.ack(msg);
				} catch (err) {
					channel.nack(msg);
				}
			}
		});
		consumerTag = consumer.consumerTag;
	} catch (err) {
		console.error('Failed to initialize RabbitMQ:', err);
		await cleanup();
		throw err;
	}
}

// Cleanup function with timeout
async function cleanup(forceExit = false) {
	if (isShuttingDown) return;
	isShuttingDown = true;

	// Create a timeout that will force exit
	const forceExitTimeout = forceExit
		? setTimeout(() => {
				console.error('Forced exit due to cleanup timeout');
				process.exit(1);
			}, 3000)
		: null;

	// Close all client connections first
	for (const client of clients) {
		try {
			client.close();
		} catch (err) {
			// Ignore client close errors
		}
	}
	clients.clear();

	try {
		// Cancel consumer if it exists
		if (channel && consumerTag) {
			try {
				await Promise.race([
					channel.cancel(consumerTag),
					new Promise((_, reject) => setTimeout(() => reject(new Error('Cancel timeout')), 1000))
				]);
			} catch (err) {
				// Ignore cancel errors
			}
			consumerTag = undefined;
		}

		// Close channel if it exists
		if (channel) {
			try {
				await Promise.race([
					channel.close(),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Channel close timeout')), 1000)
					)
				]);
			} catch (err) {
				// Ignore channel close errors
			}
			channel = undefined;
		}

		// Close connection if it exists
		if (connection) {
			try {
				await Promise.race([
					connection.close(),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Connection close timeout')), 1000)
					)
				]);
			} catch (err) {
				// Ignore connection close errors
			}
			connection = undefined;
		}
	} finally {
		if (forceExitTimeout) {
			clearTimeout(forceExitTimeout);
		}
		isShuttingDown = false;

		if (forceExit) {
			process.exit(0);
		}
	}
}

// Handle process termination with force exit
process.on('SIGTERM', () => cleanup(true));
process.on('SIGINT', () => cleanup(true));

// Handle uncaught exceptions with force exit
process.on('uncaughtException', async (err) => {
	console.error('Uncaught exception:', err);
	await cleanup(true);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (err) => {
	console.error('Unhandled rejection:', err);
	await cleanup(true);
});

export const GET: RequestHandler = async ({ setHeaders }) => {
	if (isShuttingDown) {
		throw error(503, 'Server is shutting down');
	}

	try {
		await Promise.race([
			initializeRabbitMQ(),
			new Promise((_, reject) => setTimeout(() => reject(new Error('RabbitMQ init timeout')), 5000))
		]);

		setHeaders({
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		});

		const stream = new ReadableStream({
			start(controller) {
				if (isShuttingDown) {
					controller.close();
					return;
				}

				clients.add(controller);

				// Send event history to new client
				for (const event of eventHistory) {
					try {
						broadcastToClients(event);
					} catch (err) {
						// Ignore errors when sending history
					}
				}
			},
			cancel(controller) {
				clients.delete(controller);
			}
		});

		return new Response(stream);
	} catch (err) {
		console.error('Failed to handle SSE request:', err);
		throw error(500, 'Failed to initialize event stream');
	}
};
