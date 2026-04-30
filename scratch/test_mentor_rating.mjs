const testData = () => {
  // Mock Data
  const mentees = [
    { id: '1', netScore: 40 },
    { id: '2', netScore: 60 }
  ];
  
  const menteeIds = mentees.map(m => m.id);

  const spiritualRecords = [
    { studentId: '1', overallScore: 100 },
    { studentId: '1', overallScore: 80 }, // Student 1 avg = 90
    { studentId: '2', overallScore: 60 },
    { studentId: '2', overallScore: 40 }  // Student 2 avg = 50
  ];
  // Overall Spiritual Avg = (90 + 50) / 2 = 70

  const academicTasks = [
    { id: 't1', studentId: '1', targetCount: 10 },
    { id: 't2', studentId: '2', targetCount: 5 }
  ];

  const academicRecords = [
    { taskId: 't1', studentId: '1', completedCount: 8 }, // 8/10 = 80%
    { taskId: 't2', studentId: '2', completedCount: 5 }, // 5/5 = 100%
  ];
  // Overall Academic Avg = (80 + 100) / 2 = 90

  // LOGIC FROM MentorDashboard.jsx
  let avgSpiritual = 0;
  if (spiritualRecords.length > 0) {
    const studentAverages = {};
    spiritualRecords.forEach(rec => {
      if (!studentAverages[rec.studentId]) studentAverages[rec.studentId] = { total: 0, count: 0 };
      studentAverages[rec.studentId].total += Number(rec.overallScore) || 0;
      studentAverages[rec.studentId].count += 1;
    });
    const scores = Object.values(studentAverages).map(s => s.total / s.count);
    avgSpiritual = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  let avgAcademic = 0;
  if (academicTasks.length > 0) {
    const studentScores = {};
    academicTasks.forEach(task => {
      const taskRecords = academicRecords.filter(r => r.taskId === task.id);
      if (taskRecords.length === 0) return;
      let totalCompleted = 0;
      let expectedTotal = taskRecords.length * task.targetCount;
      taskRecords.forEach(r => totalCompleted += r.completedCount);
      let completionPercent = expectedTotal > 0 ? Math.min(100, Math.round((totalCompleted / expectedTotal) * 100)) : 0;
      
      if (!studentScores[task.studentId]) studentScores[task.studentId] = { totalPercent: 0, count: 0 };
      studentScores[task.studentId].totalPercent += completionPercent;
      studentScores[task.studentId].count += 1;
    });
    
    let totalGlobalPercent = 0;
    let studentCountWithTasks = 0;
    Object.values(studentScores).forEach(s => {
      totalGlobalPercent += Math.round(s.totalPercent / s.count);
      studentCountWithTasks++;
    });
    avgAcademic = studentCountWithTasks > 0 ? (totalGlobalPercent / studentCountWithTasks) : 0;
  }

  const totalNetScore = mentees.reduce((acc, m) => acc + (m.netScore || 0), 0);
  const avgNetScore = mentees.length > 0 ? (totalNetScore / mentees.length) : 0;
  
  const mentoringScore = Math.round((avgNetScore * 0.5) + (avgSpiritual * 0.25) + (avgAcademic * 0.25));

  console.log("---- MENTOR RATING CALCULATION TEST ----");
  console.log("Mentees Total Net Score:", totalNetScore);
  console.log("Mentees Avg Net Score:", avgNetScore);
  console.log("Mentees Avg Spiritual %:", avgSpiritual);
  console.log("Mentees Avg Academic %:", avgAcademic);
  console.log("----------------------------------------");
  console.log(`Rating = (${avgNetScore} * 0.5) + (${avgSpiritual} * 0.25) + (${avgAcademic} * 0.25)`);
  console.log(`Rating = ${avgNetScore * 0.5} + ${avgSpiritual * 0.25} + ${avgAcademic * 0.25}`);
  console.log(`Final Mentor Rating =`, mentoringScore);
};

testData();
