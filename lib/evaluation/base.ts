export interface RAGEvaluationInput {
  question: string;
  answer: string;
  contexts: string[];
  groundTruth?: string;
}

export interface MetricResult {
  score: number;
  reasoning?: string;
  details?: Record<string, any>;
}

export abstract class BaseMetric {
  abstract name: string;
  abstract description: string;

  abstract evaluate(input: RAGEvaluationInput): Promise<MetricResult>;

  protected normalizeScore(score: number): number {
    return Math.max(0, Math.min(1, score));
  }
}