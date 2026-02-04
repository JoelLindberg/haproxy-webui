import { NextResponse } from "next/server";
import axios from "axios";
import parsePrometheusTextFormat from "parse-prometheus-text-format";
import { ensureAuthenticated } from "@/lib/serverAuth";

/**
 * GET /api/haproxy/metrics
 * Fetches Prometheus metrics from HAProxy's built-in exporter.
 * Returns: parsed metrics as JSON
 */
export async function GET(req: Request) {
  // enforce auth
  const authError = await ensureAuthenticated(req);
  if (authError) return authError;

  // HAProxy metrics endpoint
  // Priority: HAPROXY_METRICS_URL > constructed from HAPROXY_EXPORTER_PORT > default
  const port = process.env.HAPROXY_EXPORTER_PORT ?? "8405";
  const metricsUrl = process.env.HAPROXY_METRICS_URL ?? `http://localhost:${port}/metrics`;

  try {
    const response = await axios.get(metricsUrl, {
      timeout: 5000,
      responseType: "text",
    });

    const rawText = response.data;
    const parsed = parsePrometheusTextFormat(rawText);

    return NextResponse.json({
      success: true,
      metricsCount: parsed.length,
      metrics: parsed,
      rawLength: rawText.length,
    });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return NextResponse.json(
        {
          error: "fetch_error",
          message: `Failed to fetch metrics: ${err.message}`,
          code: err.code,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "parse_error", message: String(err) },
      { status: 500 }
    );
  }
}
