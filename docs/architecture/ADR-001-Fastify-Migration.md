# ADR-001: Backend Migration to Fastify

## Status
Accepted

## Context
The previous backend for NexusClaw relied on Express. As the system scales to support multiple sub-agents, parallel HTTP requests, and heavily utilized WebSockets for dashboard telemetry, the overhead of Express routing became a bottleneck. Furthermore, strictly typing the websocket requests was cumbersome.

## Decision
We decided to migrate the core API gateway from Express to **Fastify** (`@fastify/websocket`, `@fastify/cors`, `@fastify/static`). Fastify provides up to 2x the routing speed of Express and natively supports modern schema validations and typed route definitions out of the box.

## Consequences
**Pros:**
- Significant reduction in latency for API requests (especially during heavy parallel AI tool executions).
- Cleaner, promise-based route handlers.
- Built-in logger (Pino) is drastically faster.

**Cons:**
- The ecosystem of Fastify plugins is slightly smaller than Express middleware.
- Required rewriting all `app.use(express.json())` middleware to Fastify's native schema approach.
