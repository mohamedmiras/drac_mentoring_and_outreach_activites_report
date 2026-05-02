import { calculateEntryScore, GRADE_POINTS, STAR_POINTS_MAP } from './src/lib/scoring.js';

const testCases = [
  { grade: 'Outstanding', stars: 5, expectedNet: 10, expectedTotal: 10 },
  { grade: 'Excellent', stars: 4, expectedNet: 8, expectedTotal: 8 },
  { grade: 'Well Done', stars: 3, expectedNet: 6, expectedTotal: 6 },
  { grade: 'Very Good', stars: 2, expectedNet: 4, expectedTotal: 4 },
  { grade: 'Good', stars: 1, expectedNet: 2, expectedTotal: 2 },
  { grade: 'First Prize', stars: 5, expectedNet: 10, expectedTotal: 10 },
  { grade: 'Participation Only', stars: 1, expectedNet: 2, expectedTotal: 2 },
];

console.log("Running Scoring Arithmetic Tests...\n");
let passed = 0;

testCases.forEach((tc, i) => {
  const result = calculateEntryScore(tc.grade, tc.stars);
  const netMatch = result.netPoints === tc.expectedNet;
  const totalMatch = result.totalMarks === tc.expectedTotal;

  if (netMatch && totalMatch) {
    console.log(`✅ Test ${i + 1}: ${tc.grade} (${tc.stars}*) -> Net: ${result.netPoints}, Total: ${result.totalMarks}`);
    passed++;
  } else {
    console.error(`❌ Test ${i + 1}: ${tc.grade} (${tc.stars}*) -> FAILED`);
    console.error(`   Expected: Net ${tc.expectedNet}, Total ${tc.expectedTotal}`);
    console.error(`   Got:      Net ${result.netPoints}, Total ${result.totalMarks}`);
  }
});

console.log(`\nTests Completed: ${passed}/${testCases.length} Passed`);
process.exit(passed === testCases.length ? 0 : 1);
