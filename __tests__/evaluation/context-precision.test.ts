import { ContextPrecisionMetric } from '../../lib/evaluation/context-precision';
import { RAGEvaluationInput } from '../../lib/evaluation/base';

// Simple test runner function for demonstration
async function runTests() {
  const metric = new ContextPrecisionMetric();

  console.log('Running Context Precision Metric Tests...\n');

  // Test 1: High precision scenario
  console.log('Test 1: High precision scenario');
  const input1: RAGEvaluationInput = {
    question: 'What is machine learning?',
    answer: 'Machine learning is a subset of AI that learns from data.',
    contexts: [
      'Machine learning is a subset of artificial intelligence that enables systems to learn from data.',
      'ML algorithms use statistical techniques to find patterns in large datasets and make predictions.',
      'The field has applications in various industries including healthcare and finance.'
    ]
  };

  try {
    const result1 = await metric.evaluate(input1);
    console.log('Score:', result1.score);
    console.log('Reasoning:', result1.reasoning);
    console.log('Details:', JSON.stringify(result1.details, null, 2));
    console.log('✓ Test 1 passed\n');
  } catch (error) {
    console.log('✗ Test 1 failed:', error);
  }

  // Test 2: Low precision scenario
  console.log('Test 2: Low precision scenario');
  const input2: RAGEvaluationInput = {
    question: 'What is photosynthesis?',
    answer: 'Photosynthesis is the process plants use to make food.',
    contexts: [
      'Machine learning is a subset of artificial intelligence.',
      'The industrial revolution occurred in the 18th century.',
      'Water boils at 100 degrees Celsius at sea level.'
    ]
  };

  try {
    const result2 = await metric.evaluate(input2);
    console.log('Score:', result2.score);
    console.log('Reasoning:', result2.reasoning);
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.log('✗ Test 2 failed:', error);
  }

  // Test 3: Empty contexts
  console.log('Test 3: Empty contexts');
  const input3: RAGEvaluationInput = {
    question: 'Test question',
    answer: 'Test answer',
    contexts: []
  };

  try {
    const result3 = await metric.evaluate(input3);
    console.log('Score:', result3.score);
    console.log('Reasoning:', result3.reasoning);
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.log('✗ Test 3 failed:', error);
  }

  // Test 4: Question with "who"
  console.log('Test 4: Who question');
  const input4: RAGEvaluationInput = {
    question: 'Who invented the telephone?',
    answer: 'Alexander Graham Bell invented the telephone.',
    contexts: [
      'Alexander Graham Bell was credited with inventing the telephone in 1876.',
      'Elisha Gray also filed a patent for a similar device around the same time.',
      'The weather today is sunny with mild temperatures.'
    ]
  };

  try {
    const result4 = await metric.evaluate(input4);
    console.log('Score:', result4.score);
    console.log('Reasoning:', result4.reasoning);
    console.log('Relevant contexts:', result4.details?.relevantContexts);
    console.log('✓ Test 4 passed\n');
  } catch (error) {
    console.log('✗ Test 4 failed:', error);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };