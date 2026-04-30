export const GRADE_POINTS = {
  'Outstanding': 10,
  'Excellent': 8,
  'Well Done': 6,
  'Very Good': 4,
  'Good': 2,
  // Contest mapping
  'First Prize': 10,
  'Second Prize': 8,
  'Third Prize': 6,
  'Selection': 4,
  'Participation Only': 2,
  // Add lowercase/variations if needed
  'outstanding': 10,
  'excellent': 8,
  'well done': 6,
  'very good': 4,
  'good': 2
};

export const STAR_POINTS_MAP = {
  '5 Stars': 5,
  '4 Stars': 4,
  '3 Stars': 3,
  '2 Stars': 2,
  '1 Star': 1,
  // Support numeric strings and numbers
  '5': 5, '4': 4, '3': 3, '2': 2, '1': 1,
  5: 5, 4: 4, 3: 3, 2: 2, 1: 1
};

export const roundUpToHalf = (value) => {
  // Round UP to the next 0.5 value
  // Examples: 7.1 -> 7.5, 8.5 -> 8.5, 9.6 -> 10.0
  return Math.ceil(value * 2) / 2;
};

/**
 * Calculates all numeric scores for an achievement entry.
 * @param {string} grade - Performance grade (Wonderful, etc.)
 * @param {number|string} stars - Number of stars (1-5)
 * @returns {object} Object containing performancePoints, starPoints, netPoints, and totalMarks
 */
export const calculateEntryScore = (grade, stars) => {
  const pgp = GRADE_POINTS[grade] || 0;
  
  let sp = 0;
  if (typeof stars === 'number') {
    sp = stars;
  } else {
    sp = STAR_POINTS_MAP[stars] || parseInt(stars) || 0;
  }

  // Updated Rule: Total Marks only considers Performance Grade Points
  // Stars are tracked separately and do not contribute to the numeric score total
  const finalTotal = pgp;

  return {
    performancePoints: pgp,
    starPoints: sp,
    netPoints: pgp, // netPoints now only includes performance grade points
    totalMarks: finalTotal
  };
};

/**
 * Safely retrieves or calculates the total marks for an achievement.
 * Useful for handling old data entries.
 * @param {object} ach - Achievement object
 * @returns {number} The total marks
 */
export const getAchievementMarks = (ach) => {
  if (!ach) return 0;
  
  // 1. Prioritize totalMarks (the new standardized numeric field)
  if (typeof ach.totalMarks === 'number') return ach.totalMarks;
  
  // 2. Handle 'marks' field (legacy or slider)
  if (ach.marks !== undefined && ach.marks !== null) {
    if (typeof ach.marks === 'number') return ach.marks;
    if (typeof ach.marks === 'string') {
      // Handle "85/100" format
      if (ach.marks.includes('/')) {
        const [obt, out] = ach.marks.split('/').map(Number);
        if (!isNaN(obt) && !isNaN(out) && out > 0) {
          // You might want a specific mapping for contest marks to points here
          // For now, let's just return the obtained value or a scaled value
          return (obt / out) * 10; // Scale to 10-point system
        }
      }
      const parsed = parseFloat(ach.marks);
      if (!isNaN(parsed)) return parsed;
    }
  }

  // 3. Fallback: Recalculate based on current grade logic
  const scores = calculateEntryScore(ach.grade, ach.stars);
  return scores.totalMarks;
};
