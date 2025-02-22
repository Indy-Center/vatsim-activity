import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import amqp, { type Channel, type Connection, type ConsumeMessage } from 'amqplib';
import { RABBITMQ_URL } from '$env/static/private';

if (!RABBITMQ_URL) {
	throw new Error('RABBITMQ_URL environment variable is not set');
}

// Event history buffer
const MAX_EVENTS = 50;
const eventHistory: { routingKey: string; content: string }[] = [];

function addToHistory(routingKey: string, content: string) {
	eventHistory.unshift({ routingKey, content });
	if (eventHistory.length > MAX_EVENTS) {
		eventHistory.pop();
	}
}

export const GET: RequestHandler = async ({ setHeaders }) => {
	let connection: Connection | undefined;
	let channel: Channel | undefined;

	try {
		connection = await amqp.connect(RABBITMQ_URL);
		channel = await connection.createChannel();

		const exchange = 'vatsim.events';
		await channel.assertExchange(exchange, 'topic', { durable: true });

		const q = await channel.assertQueue('', {
			exclusive: true,
			autoDelete: true
		});

		await channel.bindQueue(q.queue, exchange, 'events.controller.connect');
		await channel.bindQueue(q.queue, exchange, 'events.controller.disconnect');

		setHeaders({
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		});

		const stream = new ReadableStream({
			start(controller) {
				let consumerTag: string;

				const setupConsumer = async () => {
					// Send event history to new client
					for (const event of eventHistory) {
						controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
					}

					const consumer = await channel!.consume(q.queue, (msg: ConsumeMessage | null) => {
						if (msg !== null && channel) {
							try {
								const data = {
									routingKey: msg.fields.routingKey,
									content: msg.content.toString()
								};
								// Add to history and send to client
								addToHistory(data.routingKey, data.content);
								controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
								channel.ack(msg);
							} catch (err) {
								console.error('Error processing message:', err);
								channel.nack(msg);
							}
						}
					});
					consumerTag = consumer.consumerTag;
				};

				setupConsumer().catch(console.error);

				return () => {
					if (channel && consumerTag) {
						channel
							.cancel(consumerTag)
							.then(() => channel?.close())
							.then(() => connection?.close())
							.catch(console.error);
					}
				};
			},
			cancel() {
				if (channel) {
					channel
						.close()
						.then(() => connection?.close())
						.catch(console.error);
				}
			}
		});

		return new Response(stream);
	} catch (err) {
		if (channel) await channel.close().catch(console.error);
		if (connection) await connection.close().catch(console.error);

		console.error('Failed to connect to RabbitMQ:', err);
		throw error(500, 'Failed to connect to RabbitMQ');
	}
};
