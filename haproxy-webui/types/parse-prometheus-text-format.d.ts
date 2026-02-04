declare module 'parse-prometheus-text-format' {
  interface MetricSample {
    labels: Record<string, string>;
    value: string;
  }

  interface ParsedMetric {
    name: string;
    help: string;
    type: string;
    metrics: MetricSample[];
  }

  function parsePrometheusTextFormat(text: string): ParsedMetric[];
  
  export = parsePrometheusTextFormat;
}
