import { RAGEvaluator } from './lib/evaluation';
import { RAGEvaluationInput } from './lib/evaluation/base';

async function demonstrateMetrics() {
  console.log('RAG Evaluation Metrics Demonstration\n');
  console.log('=====================================\n');

  const evaluator = new RAGEvaluator();
  const availableMetrics = evaluator.getAvailableMetrics();
  
  console.log('Available metrics:', availableMetrics);
  console.log('');

  // Test Case 1: Good RAG performance
  console.log('Test Case 1: Good RAG Performance');
  console.log('----------------------------------');
  
  const goodRAGInput: RAGEvaluationInput = {
    question: 'What is machine learning and how does it work?',
    answer: 'Machine learning is a subset of artificial intelligence that enables systems to learn from data without being explicitly programmed. It works by using algorithms to identify patterns in large datasets and make predictions based on those patterns. Common types include supervised learning, unsupervised learning, and reinforcement learning.',
    contexts: [
      'Machine learning is a subset of artificial intelligence that enables systems to learn from data without being explicitly programmed.',
      'ML algorithms work by identifying patterns in large datasets and using statistical methods to make predictions or decisions.',
      'The three main types of machine learning are supervised learning, unsupervised learning, and reinforcement learning, each with different approaches to training models.'
    ]
  };

  const goodResults = await evaluator.evaluateAll(goodRAGInput);
  console.log('Results:');
  for (const [metric, result] of Object.entries(goodResults)) {
    console.log(`  ${metric}: ${(result as any).score.toFixed(3)} - ${(result as any).reasoning}`);
  }
  console.log('');

  // Test Case 2: Poor RAG performance
  console.log('Test Case 2: Poor RAG Performance');
  console.log('----------------------------------');
  
  const poorRAGInput: RAGEvaluationInput = {
    question: 'What is photosynthesis?',
    answer: 'Photosynthesis is the process by which plants convert sunlight into electrical energy. It occurs primarily in the mitochondria and requires oxygen to function properly. This process was discovered in 2020 by researchers.',
    contexts: [
      'Machine learning is a field of artificial intelligence that focuses on developing algorithms.',
      'The Industrial Revolution began in the 18th century and transformed manufacturing.',
      'Water consists of hydrogen and oxygen molecules and is essential for life.'
    ]
  };

  const poorResults = await evaluator.evaluateAll(poorRAGInput);
  console.log('Results:');
  for (const [metric, result] of Object.entries(poorResults)) {
    console.log(`  ${metric}: ${(result as any).score.toFixed(3)} - ${(result as any).reasoning}`);
  }
  console.log('');

  // Test Case 3: Mixed performance
  console.log('Test Case 3: Mixed Performance');
  console.log('------------------------------');
  
  const mixedRAGInput: RAGEvaluationInput = {
    question: 'Who invented the telephone and when?',
    answer: 'Alexander Graham Bell invented the telephone in 1876. He was a scientist and inventor who worked with sound and communication. The first successful telephone call was made to his assistant.',
    contexts: [
      'Alexander Graham Bell was credited with inventing the telephone in 1876.',
      'Bell was a Scottish-born scientist and inventor who worked extensively with sound and communication technologies.',
      'The first successful telephone call was made on March 10, 1876, when Bell spoke to his assistant Thomas Watson.',
      'The weather in Boston was particularly nice that spring day in 1876.'
    ]
  };

  const mixedResults = await evaluator.evaluateAll(mixedRAGInput);
  console.log('Results:');
  for (const [metric, result] of Object.entries(mixedResults)) {
    console.log(`  ${metric}: ${(result as any).score.toFixed(3)} - ${(result as any).reasoning}`);
  }
  console.log('');

  // Summary
  console.log('Summary');
  console.log('-------');
  console.log('Faithfulness Metric: Measures factual consistency of answer against contexts');
  console.log('Context Precision Metric: Measures proportion of relevant contexts in retrieved set');
  console.log('');
  console.log('Both metrics return scores between 0 (worst) and 1 (best)');
  console.log('Higher scores indicate better RAG system performance');
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateMetrics().catch(console.error);
}

export { demonstrateMetrics };