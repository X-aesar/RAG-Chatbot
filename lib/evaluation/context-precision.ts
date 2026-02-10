import { BaseMetric, RAGEvaluationInput, MetricResult } from './base';

export class ContextPrecisionMetric extends BaseMetric {
  name = 'context_precision';
  description = 'Measures the proportion of relevant contexts in the retrieved context set';

  async evaluate(input: RAGEvaluationInput): Promise<MetricResult> {
    const { question, contexts, groundTruth } = input;

    if (!contexts || contexts.length === 0) {
      return {
        score: 0,
        reasoning: 'No contexts provided for evaluation',
        details: { totalContexts: 0, relevantContexts: 0, contextAnalysis: [] }
      };
    }

    // Evaluate each context for relevance to the question
    const contextRelevances = await Promise.all(
      contexts.map((context, index) => this.evaluateContextRelevance(question, context, index))
    );

    const relevantContexts = contextRelevances.filter(r => r.isRelevant);
    const precision = this.normalizeScore(relevantContexts.length / contexts.length);

    return {
      score: precision,
      reasoning: `${relevantContexts.length} out of ${contexts.length} contexts are relevant to the question`,
      details: {
        totalContexts: contexts.length,
        relevantContexts: relevantContexts.length,
        precision: precision,
        contextAnalysis: contextRelevances.map((relevance, index) => ({
          contextIndex: index,
          isRelevant: relevance.isRelevant,
          relevanceScore: relevance.relevanceScore,
          reasoning: relevance.reasoning,
          contextPreview: contexts[index].substring(0, 150) + '...'
        }))
      }
    };
  }

  private async evaluateContextRelevance(
    question: string,
    context: string,
    index: number
  ): Promise<{ isRelevant: boolean; relevanceScore: number; reasoning: string }> {
    // Extract key terms from the question
    const questionTerms = this.extractKeyTerms(question);
    
    if (questionTerms.length === 0) {
      return {
        isRelevant: false,
        relevanceScore: 0,
        reasoning: 'No significant terms found in question'
      };
    }

    // Check for question terms in the context
    const contextLower = context.toLowerCase();
    let matchedTerms = 0;
    const foundTerms: string[] = [];

    for (const term of questionTerms) {
      if (contextLower.includes(term.toLowerCase())) {
        matchedTerms++;
        foundTerms.push(term);
      }
    }

    const termCoverage = matchedTerms / questionTerms.length;
    
    // Additional checks for semantic relevance
    const semanticScore = this.calculateSemanticRelevance(question, context);
    
    // Combine term coverage and semantic relevance
    const combinedScore = (termCoverage * 0.6) + (semanticScore * 0.4);
    
    const isRelevant = combinedScore >= 0.3; // Threshold for relevance

    return {
      isRelevant,
      relevanceScore: combinedScore,
      reasoning: isRelevant
        ? `Context contains ${matchedTerms}/${questionTerms.length} question terms (${foundTerms.join(', ')}) and shows semantic relevance (score: ${semanticScore.toFixed(2)})`
        : `Insufficient relevance: only ${matchedTerms}/${questionTerms.length} terms found and low semantic similarity (score: ${semanticScore.toFixed(2)})`
    };
  }

  private extractKeyTerms(text: string): string[] {
    // Remove common punctuation and split into words
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Filter out stop words and return significant terms
    return words.filter(word => !this.isStopWord(word));
  }

  private calculateSemanticRelevance(question: string, context: string): number {
    // Simple heuristic-based semantic relevance scoring
    // In a production system, you might use embeddings or NLI models
    
    const questionLower = question.toLowerCase();
    const contextLower = context.toLowerCase();
    
    let score = 0;

    // Check for question words (what, who, where, when, why, how)
    const questionWords = ['what', 'who', 'where', 'when', 'why', 'how', 'which', 'whom'];
    const hasQuestionWord = questionWords.some(qw => questionLower.includes(qw));
    
    if (hasQuestionWord) {
      // If it's a question, look for answer patterns in context
      if (questionLower.includes('who')) {
        // Look for names, people indicators
        const nameIndicators = ['said', 'stated', 'according to', 'author', 'researcher'];
        if (nameIndicators.some(indicator => contextLower.includes(indicator))) {
          score += 0.3;
        }
      }
      
      if (questionLower.includes('when')) {
        // Look for time indicators
        const timeIndicators = ['year', 'date', 'time', 'period', 'century', 'era'];
        if (timeIndicators.some(indicator => contextLower.includes(indicator))) {
          score += 0.3;
        }
      }
      
      if (questionLower.includes('where')) {
        // Look for location indicators
        const locationIndicators = ['located', 'found', 'place', 'city', 'country', 'region'];
        if (locationIndicators.some(indicator => contextLower.includes(indicator))) {
          score += 0.3;
        }
      }
    }

    // Check for definitional content
    if (questionLower.includes('what') || questionLower.includes('define')) {
      const definitionalIndicators = ['is defined as', 'refers to', 'means', 'is a', 'are', 'definition'];
      if (definitionalIndicators.some(indicator => contextLower.includes(indicator))) {
        score += 0.4;
      }
    }

    // Check for explanatory content
    if (questionLower.includes('why') || questionLower.includes('how')) {
      const explanatoryIndicators = ['because', 'due to', 'reason', 'cause', 'process', 'method'];
      if (explanatoryIndicators.some(indicator => contextLower.includes(indicator))) {
        score += 0.4;
      }
    }

    // General relevance: check if context contains the main subject
    const mainSubjects = this.extractMainSubjects(question);
    for (const subject of mainSubjects) {
      if (contextLower.includes(subject.toLowerCase())) {
        score += 0.2;
      }
    }

    return Math.min(1, score);
  }

  private extractMainSubjects(question: string): string[] {
    // Simple extraction of potential main subjects
    // This is a heuristic approach - in production you'd use NLP
    
    const words = question.toLowerCase().split(/\s+/);
    const subjects: string[] = [];
    
    // Look for noun-like patterns (simple heuristic)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Skip stop words and short words
      if (this.isStopWord(word) || word.length < 3) continue;
      
      // Look for capitalized words (proper nouns) or significant content words
      if (word.charAt(0).match(/[a-z]/) && !['the', 'and', 'for', 'with', 'from'].includes(word)) {
        subjects.push(word);
      }
    }
    
    return subjects.slice(0, 3); // Return top 3 potential subjects
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'is',
      'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
      'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'not', 'no', 'yes', 'all', 'any', 'each', 'every', 'both', 'few',
      'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 'just', 'now', 'also', 'here', 'there', 'when'
    ]);
    return stopWords.has(word.toLowerCase());
  }
}