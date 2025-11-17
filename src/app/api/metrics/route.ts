import client, { collectDefaultMetrics,Registry } from 'prom-client';

declare global {
  // preserve registry across module reloads (Next dev / serverless)
  // eslint-disable-next-line no-var
  var __promClientRegistry: Registry | undefined;
}

const register = globalThis.__promClientRegistry ?? new Registry();

if (!globalThis.__promClientRegistry) {
  globalThis.__promClientRegistry = register;
  // collect default metrics once
  collectDefaultMetrics({ register });
}

// ensure custom metric is registered only once
let httpRequestDuration = register.getSingleMetric('http_request_duration_seconds') as
  | client.Histogram<string>
  | undefined;

if (!httpRequestDuration) {
  httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5],
  });
  register.registerMetric(httpRequestDuration);
}

export async function GET() {
  const metrics = await register.metrics();
  return new Response(metrics, {
    status: 200,
    headers: {
      'Content-Type': register.contentType ?? 'text/plain; version=0.0.4',
    },
  });
}