export { BaseMetric, type RAGEvaluationInput, type MetricResult } from './base';
export { FaithfulnessMetric } from './faithfulness';
export { ContextPrecisionMetric } from './context-precision';

export class RAGEvaluator {
  private metrics: Map<string, any> = new Map();

  constructor() {
    // Register default metrics
    this.registerMetric(new (require('./faithfulness').FaithfulnessMetric)());
    this.registerMetric(new (require('./context-precision').ContextPrecisionMetric)());
  }

  registerMetric(metric: any) {
    this.metrics.set(metric.name, metric);
  }

  async evaluateAll(input: any): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const [name, metric] of this.metrics) {
      try {
        results[name] = await metric.evaluate(input);
      } catch (error) {
        results[name] = {
          score: 0,
          reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
    
    return results;
  }

  async evaluateSingle(metricName: string, input: any): Promise<any> {
    const metric = this.metrics.get(metricName);
    if (!metric) {
      throw new Error(`Metric '${metricName}' not found`);
    }
    
    return await metric.evaluate(input);
  }

  getAvailableMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }
}