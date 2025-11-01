// Shared Achievements Utility
// Provides a single source of truth for achievement definitions and evaluation.

export const ACHIEVEMENT_DEFINITIONS = [
  { id:'first_quiz', name:'First Steps', icon:'👟', tier:'Common', description:'Completed your first quiz session', goal:1, prop:'totalSessions' },
  { id:'quiz_apprentice', name:'Quiz Apprentice', icon:'📘', tier:'Common', description:'Completed 5 quiz sessions', goal:5, prop:'totalSessions' },
  { id:'quiz_veteran', name:'Quiz Veteran', icon:'📗', tier:'Uncommon', description:'Completed 20 quiz sessions', goal:20, prop:'totalSessions' },
  // Marathon series repurposed: now counts completed quiz sessions instead of elapsed time
  { id:'marathon_1', name:'Marathon I', icon:'⏱️', tier:'Common', description:'Complete 10 quiz sessions', goal:10, prop:'totalSessions' },
  { id:'marathon_2', name:'Marathon II', icon:'🕒', tier:'Uncommon', description:'Complete 50 quiz sessions', goal:50, prop:'totalSessions' },
  { id:'points_1k', name:'Scholar', icon:'📚', tier:'Common', description:'Earned 1,000 total points', goal:1000, prop:'totalPoints' },
  { id:'points_5k', name:'Top Scorer', icon:'🏆', tier:'Rare', description:'Earned 5,000 total points', goal:5000, prop:'totalPoints' },
  { id:'points_10k', name:'Legend', icon:'👑', tier:'Epic', description:'Earned 10,000 total points', goal:10000, prop:'totalPoints' },
  { id:'points_5m', name:'Mythic Scholar', icon:'🌌', tier:'Mythic', description:'Accumulate 5,000,000 total points', goal:5000000, prop:'totalPoints' },
  { id:'accuracy_ace', name:'Accuracy Ace', icon:'🎯', tier:'Uncommon', description:'Reach 80% average accuracy', goal:80, prop:'averageAccuracy' },
  { id:'accuracy_master', name:'Accuracy Master', icon:'💠', tier:'Rare', description:'Reach 90%+ average accuracy', goal:90, prop:'averageAccuracy' },
  { id:'combo_starter', name:'Combo Starter', icon:'🔥', tier:'Common', description:'Achieve a 10+ answer streak', goal:10, prop:'highestStreak' },
  { id:'combo_master', name:'Combo Master', icon:'🔥', tier:'Rare', description:'Achieve a 30+ answer streak', goal:30, prop:'highestStreak' },
  { id:'course_finisher', name:'Course Finisher', icon:'✅', tier:'Uncommon', description:'Complete at least one course', goal:1, prop:'completedCourses' },
  { id:'multi_talented', name:'Multi-Talented', icon:'🧠', tier:'Rare', description:'Complete 3+ courses', goal:3, prop:'completedCourses' },
  { id:'completionist', name:'Completionist', icon:'🌟', tier:'Epic', description:'Complete all courses', dynamicGoal: stats => Math.max(Object.keys(stats.courseCompletionStatus||{}).length,1), prop:'completedCourses' },
  { id:'perfect_quiz', name:'Perfectionist', icon:'💯', tier:'Epic', description:'Achieve a perfect quiz session', goal:1, special: 'perfectSession' }
  ,{ id:'accuracy_grandmaster', name:'Accuracy Grandmaster', icon:'🎯', tier:'Mythic', description:'Reach 95%+ average accuracy', goal:95, prop:'averageAccuracy' }
  ,{ id:'unbreakable', name:'Unbreakable', icon:'🛡️', tier:'Mythic', description:'Achieve a 75+ answer streak', goal:75, prop:'highestStreak' }
  ,{ id:'endurance_master', name:'Endurance Master', icon:'🏁', tier:'Mythic', description:'Complete 500 quiz sessions', goal:500, prop:'totalSessions' }
];

export function evaluateAchievements(careerStats, recentSessions = {}, existingUnlocked = {}) {
  const totalPlayTimeSeconds = careerStats.totalPlayTime || 0; // assuming tracked elsewhere
  const courseCompletionStatus = careerStats.courseCompletionStatus || {};
  const completedCourses = Object.values(courseCompletionStatus).filter(Boolean).length;
  const sessionsArr = Object.values(recentSessions);
  const perfectSession = sessionsArr.some(s => (s.accuracyPercentage || 0) >= 100);
  // fastSession logic removed (Speed Demon retired)

  const context = {
    totalSessions: careerStats.totalSessions || 0,
    totalPoints: careerStats.totalPoints || 0,
    averageAccuracy: careerStats.averageAccuracy || 0,
    highestStreak: careerStats.highestStreak || 0,
    completedCourses,
    totalPlayTimeSeconds,
    perfectSession: perfectSession ? 1 : 0,
    courseCompletionStatus
  };

  const unlocked = [];
  const newlyUnlocked = [];
  const locked = [];

  ACHIEVEMENT_DEFINITIONS.forEach(def => {
    let goal = def.goal;
    if (def.dynamicGoal) {
      goal = def.dynamicGoal({ courseCompletionStatus });
    }
    let progress;
    if (def.special) {
      progress = context[def.special];
    } else {
      const raw = context[def.prop];
      progress = def.transform ? def.transform(raw) : raw;
    }
    const percent = Math.min(100, Math.round((progress / goal) * 100));
    const isUnlocked = progress >= goal;
    const base = { ...def, goal, progress, percent, unlocked: isUnlocked };
    if (isUnlocked) {
      unlocked.push(base);
      if (!existingUnlocked[def.id]) {
        newlyUnlocked.push(base);
      }
    } else {
      locked.push(base);
    }
  });

  return { unlocked, locked, newlyUnlocked, all: [...unlocked, ...locked] };
}
