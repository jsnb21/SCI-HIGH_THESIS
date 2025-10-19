// Data aggregation service for leaderboards
// Export: aggregateCareerStats({ careerData, studentsData, filter })

function buildStudentNameMap(studentsData) {
  const map = {};
  if (!studentsData || typeof studentsData !== 'object') return map;
  Object.values(studentsData).forEach(student => {
    try {
      if (student && student.studentId) {
        map[student.studentId] = {
          name: student.name || student.fullName || 'Unknown Student',
          department: student.department || 'Unknown'
        };
      }
    } catch (_) {}
  });
  return map;
}

function deptTypeFromString(dept) {
  if (!dept) return 'other';
  const d = String(dept).toLowerCase();
  if (d.includes('college')) return 'college';
  if (d.includes('senior')) return 'seniorhigh';
  if (d.includes('junior')) return 'juniorhigh';
  return 'other';
}

export function aggregateCareerStats({ careerData, studentsData, filter = 'overall' }) {
  if (!careerData || typeof careerData !== 'object') return [];

  const studentNameMap = buildStudentNameMap(studentsData);
  const studentAccumulator = new Map();

  Object.entries(careerData).forEach(([studentId, statsData]) => {
    if (!statsData || !statsData.careerStats || !statsData.studentInfo) return;

    const career = statsData.careerStats;
    const info = statsData.studentInfo;

    const studentInfo = studentNameMap[studentId];

    let studentName = 'Unknown Student';
    if (studentInfo?.name) {
      studentName = studentInfo.name;
    } else if (info.fullName) {
      studentName = info.fullName;
    } else if (statsData.firstName || statsData.lastName) {
      const firstName = statsData.firstName || '';
      const lastName = statsData.lastName || '';
      const middleName = statsData.middleName || '';
      if (firstName && lastName) studentName = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
      else if (firstName) studentName = firstName;
      else if (lastName) studentName = lastName;
    } else if (statsData.studentInfo?.studentName) {
      studentName = statsData.studentInfo.studentName;
    }
    studentName = (studentName || '').trim() || `Student ${studentId}`;

    let department = studentInfo?.department || statsData.department || 'Unknown';
    const departmentType = deptTypeFromString(department);

    if (filter !== 'overall') {
      if (filter === 'college' && departmentType !== 'college') return;
      if (filter === 'seniorhigh' && departmentType !== 'seniorhigh') return;
      if (filter === 'juniorhigh' && departmentType !== 'juniorhigh') return;
    }

    const accumulatorKey = `${studentName}_${department}`.toLowerCase();
    if (studentAccumulator.has(accumulatorKey)) {
      const existing = studentAccumulator.get(accumulatorKey);
      existing.score += career.totalPoints || 0;
      existing.totalSessions += career.totalSessions || 0;

      const totalQuestions = (existing.totalQuestions || 0) + (career.totalQuestions || 0);
      const totalCorrectAnswers = (existing.totalCorrectAnswers || 0) + (career.totalCorrectAnswers || 0);
      existing.averageAccuracy = totalQuestions > 0 ? Math.round((totalCorrectAnswers / totalQuestions) * 100) : 0;
      existing.totalQuestions = totalQuestions;
      existing.totalCorrectAnswers = totalCorrectAnswers;

      existing.highestStreak = Math.max(existing.highestStreak || 0, career.highestStreak || 0);

      const existingCompletion = existing.courseCompletionStatus || {};
      const newCompletion = career.courseCompletionStatus || {};
      Object.entries(newCompletion).forEach(([course, completed]) => {
        if (completed) existingCompletion[course] = true;
      });
      const totalCourses = Object.keys(existingCompletion).length;
      const completedCourses = Object.values(existingCompletion).filter(Boolean).length;
      existing.completedCourses = completedCourses;
      existing.totalCourses = totalCourses;
      existing.completionPercentage = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

      if (info.lastUpdated && (!existing.lastUpdated || new Date(info.lastUpdated) > new Date(existing.lastUpdated))) {
        existing.lastUpdated = info.lastUpdated;
      }
      existing.courseCompletionStatus = existingCompletion;
    } else {
      const completionStatus = career.courseCompletionStatus || {};
      const totalCourses = Object.keys(completionStatus).length;
      const completedCourses = Object.values(completionStatus).filter(Boolean).length;
      const completionPercentage = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

      studentAccumulator.set(accumulatorKey, {
        studentId: studentId,
        userId: studentId,
        name: studentName,
        firstName: statsData.firstName || '',
        lastName: statsData.lastName || '',
        department: department,
        strandYear: statsData.strandYear || '',
        score: career.totalPoints || 0,
        totalSessions: career.totalSessions || 0,
        averageAccuracy: career.averageAccuracy || 0,
        totalQuestions: career.totalQuestions || 0,
        totalCorrectAnswers: career.totalCorrectAnswers || 0,
        highestStreak: career.highestStreak || 0,
        completedCourses: completedCourses,
        totalCourses: totalCourses,
        completionPercentage: completionPercentage,
        courseCompletionStatus: completionStatus,
        lastUpdated: info.lastUpdated || '',
        recentSessions: statsData.recentSessions || {}
      });
    }
  });

  const leaderboardData = Array.from(studentAccumulator.values());
  leaderboardData.sort((a, b) => (b.score || 0) - (a.score || 0));
  return leaderboardData;
}

// High-level loader that accepts a db provider for testability/DI.
// dbProvider: async () => firebase.database()
export async function loadCareerStatsAggregated(dbProvider, filter = 'overall') {
  const db = await dbProvider();
  const [careerSnapshot, studentsSnapshot] = await Promise.all([
    db.ref('student_career_stats').once('value'),
    db.ref('students').once('value').catch(() => ({ val: () => null }))
  ]);
  const careerData = careerSnapshot.val();
  if (!careerData) return [];
  const studentsData = studentsSnapshot && typeof studentsSnapshot.val === 'function' ? studentsSnapshot.val() : null;
  return aggregateCareerStats({ careerData, studentsData, filter });
}
