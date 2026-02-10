import { BaseMetric, RAGEvaluationInput, MetricResult } from './base';

export class FaithfulnessMetric extends BaseMetric {
  name = 'faithfulness';
  description = 'Measures the factual consistency of the generated answer against the given context';

  async evaluate(input: RAGEvaluationInput): Promise<MetricResult> {
    const { answer, contexts } = input;

    // Split answer into individual claims/statements
    const claims = this.extractClaims(answer);
    
    if (claims.length === 0) {
      return {
        score: 0,
        reasoning: 'No claims could be extracted from the answer',
        details: { claims: [], supportedClaims: [], unsupportedClaims: [] }
      };
    }

    // Evaluate each claim against the contexts
    const claimResults = await Promise.all(
      claims.map(claim => this.evaluateClaim(claim, contexts))
    );

    const supportedClaims = claimResults.filter(r => r.supported);
    const unsupportedClaims = claimResults.filter(r => !r.supported);

    // Calculate faithfulness score: ratio of supported claims to total claims
    const score = this.normalizeScore(supportedClaims.length / claims.length);

    return {
      score,
      reasoning: `${supportedClaims.length} out of ${claims.length} claims are supported by the provided contexts`,
      details: {
        totalClaims: claims.length,
        supportedClaims: supportedClaims.length,
        unsupportedClaims: unsupportedClaims.length,
        claimResults: claimResults.map((result, index) => ({
          claim: claims[index],
          supported: result.supported,
          reasoning: result.reasoning,
          supportingContext: result.supportingContext
        }))
      }
    };
  }

  private extractClaims(answer: string): string[] {
    // Split by sentence-ending punctuation and filter out empty strings
    const sentences = answer
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Further split complex sentences into individual claims
    const claims: string[] = [];
    
    sentences.forEach(sentence => {
      // Look for claim indicators like "because", "therefore", "however", etc.
      const claimIndicators = ['because', 'therefore', 'however', 'thus', 'consequently', 'moreover'];
      
      let currentClaim = sentence;
      for (const indicator of claimIndicators) {
        if (sentence.toLowerCase().includes(indicator)) {
          const parts = sentence.split(new RegExp(`\\b${indicator}\\b`, 'i'));
          if (parts.length > 1) {
            claims.push(parts[0].trim());
            currentClaim = parts.slice(1).join(indicator).trim();
            break;
          }
        }
      }
      
      if (currentClaim) {
        claims.push(currentClaim);
      }
    });

    return claims.filter(claim => claim.length > 10); // Filter out very short fragments
  }

  private async evaluateClaim(
    claim: string, 
    contexts: string[]
  ): Promise<{ supported: boolean; reasoning: string; supportingContext?: string }> {
    // Simple keyword-based support detection
    // In a production system, you might use semantic similarity or NLI models
    
    const claimWords = claim.toLowerCase().split(/\s+/);
    const keyTerms = claimWords.filter(word => 
      word.length > 3 && 
      !this.isStopWord(word)
    );

    if (keyTerms.length === 0) {
      return {
        supported: false,
        reasoning: 'No significant terms found in claim'
      };
    }

    let bestMatch = {
      supported: false,
      reasoning: 'No supporting context found',
      supportingContext: '',
      score: 0
    };

    // Check each context for supporting evidence
    for (const context of contexts) {
      const contextLower = context.toLowerCase();
      let matchScore = 0;
      const matchedTerms: string[] = [];

      // Count how many key terms appear in the context
      for (const term of keyTerms) {
        if (contextLower.includes(term)) {
          matchScore += 1;
          matchedTerms.push(term);
        }
      }

      // If enough key terms are present, consider it supported
      const coverageRatio = matchScore / keyTerms.length;
      
      if (coverageRatio > bestMatch.score) {
        bestMatch = {
          supported: coverageRatio >= 0.5, // At least 50% of key terms should match
          reasoning: coverageRatio >= 0.5 
            ? `Found ${matchScore}/${keyTerms.length} key terms: ${matchedTerms.join(', ')}`
            : `Insufficient coverage: only ${matchScore}/${keyTerms.length} key terms found`,
          supportingContext: context.substring(0, 200) + '...',
          score: coverageRatio
        };
      }
    }

    return {
      supported: bestMatch.supported,
      reasoning: bestMatch.reasoning,
      supportingContext: bestMatch.supportingContext
    };
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
      'can', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'not', 'no'
    ]);
    return stopWords.has(word.toLowerCase());
  }
}