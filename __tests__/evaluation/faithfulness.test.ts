import { FaithfulnessMetric } from '../../lib/evaluation/faithfulness';
import { RAGEvaluationInput } from '../../lib/evaluation/base';

// Simple test runner function for demonstration
async function runTests() {
  const metric = new FaithfulnessMetric();

  console.log('Running Faithfulness Metric Tests...\n');

  // Test 1: High faithfulness scenario
  console.log('Test 1: High faithfulness scenario');
  const input1: RAGEvaluationInput = {
    question: 'What is machine learning?',
    answer: 'Machine learning is a subset of artificial intelligence that enables systems to learn from data. It uses algorithms to find patterns in datasets.',
    contexts: [
      'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
      'ML algorithms use statistical techniques to find patterns in large datasets and make predictions based on historical data.'
    ]
  };

  try {
    const result1 = await metric.evaluate(input1);
    console.log('Score:', result1.score);
    console.log('Reasoning:', result1.reasoning);
    console.log('Total Claims:', result1.details?.totalClaims);
    console.log('Supported Claims:', result1.details?.supportedClaims);
    console.log('Unsupported Claims:', result1.details?.unsupportedClaims);
    console.log('✓ Test 1 passed\n');
  } catch (error) {
    console.log('✗ Test 1 failed:', error);
  }

  // Test 2: Low faithfulness scenario (with incorrect information)
  console.log('Test 2: Low faithfulness scenario');
  const input2: RAGEvaluationInput = {
    question: 'What is photosynthesis?',
    answer: 'Photosynthesis is the process by which plants convert sunlight into chemical energy. It occurs in the mitochondria.',
    contexts: [
      'Photosynthesis is the process by which plants convert sunlight into chemical energy. It occurs in the chloroplasts.',
      'During photosynthesis, plants use carbon dioxide and water to produce glucose and oxygen.'
    ]
  };

  try {
    const result2 = await metric.evaluate(input2);
    console.log('Score:', result2.score);
    console.log('Reasoning:', result2.reasoning);
    console.log('Claim results:', JSON.stringify(result2.details?.claimResults, null, 2));
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.log('✗ Test 2 failed:', error);
  }

  // Test 3: Empty answer
  console.log('Test 3: Empty answer');
  const input3: RAGEvaluationInput = {
    question: 'Test question',
    answer: '',
    contexts: ['Some context']
  };

  try {
    const result3 = await metric.evaluate(input3);
    console.log('Score:', result3.score);
    console.log('Reasoning:', result3.reasoning);
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.log('✗ Test 3 failed:', error);
  }

  // Test 4: Complex sentence structure
  console.log('Test 4: Complex sentence structure');
  const input4: RAGEvaluationInput = {
    question: 'Why is machine learning important?',
    answer: 'Machine learning is powerful because it can process large amounts of data. Therefore, it is widely used in industry. However, it requires quality data to work effectively.',
    contexts: [
      'Machine learning is indeed powerful and can process large amounts of data, which is why it is widely used in industry.',
      'The effectiveness of ML systems depends heavily on the quality of training data available.'
    ]
  };

  try {
    const result4 = await metric.evaluate(input4);
    console.log('Score:', result4.score);
    console.log('Total Claims:', result4.details?.totalClaims);
    console.log('Supported Claims:', result4.details?.supportedClaims);
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