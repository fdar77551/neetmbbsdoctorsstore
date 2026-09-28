import { 
  MockTest, 
  MockQuestion, 
  MockTestPurchase, 
  MockTestAttempt, 
  MockTestLeaderboardEntry,
  MockSubject,
  SubjectScoreBreakdown
} from '../types';

export const MOCK_TESTS_STORAGE_KEY = 'neetmbbs_mock_tests_data';
export const MOCK_QUESTIONS_STORAGE_KEY_PREFIX = 'neetmbbs_mock_questions_';
export const MOCK_PURCHASES_STORAGE_KEY = 'neetmbbs_mock_purchases';
export const MOCK_ATTEMPTS_STORAGE_KEY = 'neetmbbs_mock_attempts';

// High-Yield Accurate Scientific Diagram SVGs (Data URLs) to ensure zero AI hallucinations and crisp scientific rendering
export const SCIENTIFIC_SAMPLE_DIAGRAMS = {
  benzeneResonance: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="240" height="180"><rect width="240" height="180" fill="%23ffffff" rx="8"/><g stroke="%230f172a" stroke-width="2.5" fill="none" stroke-linejoin="round"><polygon points="80,45 110,62.3 110,97 80,114.3 50,97 50,62.3"/><circle cx="80" cy="79.6" r="22" stroke="%232563eb" stroke-width="2" stroke-dasharray="4,3"/><line x1="125" y1="79.6" x2="155" y2="79.6" stroke="%23dc2626" stroke-width="2"/><polygon points="152,75 162,79.6 152,84.2" fill="%23dc2626"/><polygon points="190,45 220,62.3 220,97 190,114.3 160,97 160,62.3"/><line x1="190" y1="52" x2="214" y2="65.8"/><line x1="214" y1="93.5" x2="190" y2="107.3"/><line x1="166" y1="93.5" x2="166" y2="65.8"/></g><text x="80" y="145" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155" text-anchor="middle">Resonance Hybrid</text><text x="190" y="145" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155" text-anchor="middle">Kekulé Structure</text></svg>`,
  circuitDiagram: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 160" width="260" height="160"><rect width="260" height="160" fill="%23ffffff" rx="8"/><g stroke="%230f172a" stroke-width="2" fill="none"><line x1="30" y1="80" x2="60" y2="80"/><line x1="60" y1="80" x2="65" y2="68"/><line x1="65" y1="68" x2="75" y2="92"/><line x1="75" y1="92" x2="85" y2="68"/><line x1="85" y1="68" x2="95" y2="92"/><line x1="95" y1="92" x2="105" y2="68"/><line x1="105" y1="68" x2="110" y2="80"/><line x1="110" y1="80" x2="140" y2="80"/><line x1="140" y1="70" x2="140" y2="90"/><line x1="146" y1="62" x2="146" y2="98" stroke-width="3"/><line x1="152" y1="70" x2="152" y2="90"/><line x1="158" y1="62" x2="158" y2="98" stroke-width="3"/><line x1="158" y1="80" x2="230" y2="80"/><circle cx="200" cy="80" r="14" fill="%23f8fafc" stroke="%232563eb"/><text x="200" y="85" font-family="sans-serif" font-size="12" font-weight="bold" fill="%232563eb" text-anchor="middle">G</text></g><text x="85" y="55" font-family="sans-serif" font-size="11" font-weight="bold" fill="%230f172a" text-anchor="middle">R = 10 Ω</text><text x="149" y="125" font-family="sans-serif" font-size="11" font-weight="bold" fill="%230f172a" text-anchor="middle">E = 12V</text></svg>`,
  rayOpticsDiagram: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 160" width="260" height="160"><rect width="260" height="160" fill="%23ffffff" rx="8"/><g stroke="%23334155" stroke-width="1.5" fill="none"><line x1="20" y1="80" x2="240" y2="80" stroke-dasharray="4,3"/><path d="M 130 20 Q 142 80 130 140 Q 118 80 130 20 Z" fill="%23e0f2fe" stroke="%230284c7" stroke-width="2"/><line x1="50" y1="80" x2="50" y2="45" stroke="%2316a34a" stroke-width="2.5"/><polygon points="46,47 50,38 54,47" fill="%2316a34a"/><line x1="50" y1="45" x2="130" y2="45" stroke="%23dc2626" stroke-width="1.5"/><line x1="130" y1="45" x2="200" y2="105" stroke="%23dc2626" stroke-width="1.5"/><line x1="50" y1="45" x2="200" y2="105" stroke="%232563eb" stroke-width="1.5"/><line x1="200" y1="80" x2="200" y2="105" stroke="%23dc2626" stroke-width="2"/><polygon points="196,102 200,111 204,102" fill="%23dc2626"/></g><text x="50" y="98" font-family="sans-serif" font-size="10" font-weight="bold" fill="%2316a34a" text-anchor="middle">Object (2F)</text><text x="200" y="70" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23dc2626" text-anchor="middle">Image (2F)</text><text x="130" y="152" font-family="sans-serif" font-size="10" font-weight="bold" fill="%230284c7" text-anchor="middle">Convex Lens (f)</text></svg>`,
  chloroplastDiagram: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 160" width="260" height="160"><rect width="260" height="160" fill="%23ffffff" rx="8"/><ellipse cx="130" cy="80" rx="100" ry="55" fill="%23f0fdf4" stroke="%2316a34a" stroke-width="2.5"/><ellipse cx="130" cy="80" rx="94" ry="49" fill="none" stroke="%2315803d" stroke-width="1.5" stroke-dasharray="3,2"/><g fill="%2322c55e" stroke="%2314532d" stroke-width="1.5"><rect x="75" y="65" width="25" height="7" rx="3"/><rect x="75" y="75" width="25" height="7" rx="3"/><rect x="75" y="85" width="25" height="7" rx="3"/><rect x="135" y="60" width="25" height="7" rx="3"/><rect x="135" y="70" width="25" height="7" rx="3"/><rect x="135" y="80" width="25" height="7" rx="3"/><rect x="135" y="90" width="25" height="7" rx="3"/><line x1="100" y1="78" x2="135" y2="78" stroke="%2315803d" stroke-width="2"/></g><text x="87" y="112" font-family="sans-serif" font-size="10" font-weight="bold" fill="%2314532d" text-anchor="middle">Granum</text><text x="147" y="118" font-family="sans-serif" font-size="10" font-weight="bold" fill="%2314532d" text-anchor="middle">Thylakoid</text><text x="185" y="55" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23166534">Stroma</text></svg>`,
  // Chemical structure options A, B, C, D
  structureA: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80"><rect width="100" height="80" fill="%23ffffff" rx="6"/><g stroke="%230f172a" stroke-width="2" fill="none"><polygon points="50,15 75,29.4 75,58.3 50,72.7 25,58.3 25,29.4"/><circle cx="50" cy="43.8" r="16" stroke="%23dc2626" stroke-width="1.5"/><line x1="50" y1="15" x2="50" y2="3" stroke="%230f172a"/><text x="50" y="3" font-family="sans-serif" font-size="9" font-weight="bold" fill="%232563eb" text-anchor="middle">OH</text></g></svg>`,
  structureB: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80"><rect width="100" height="80" fill="%23ffffff" rx="6"/><g stroke="%230f172a" stroke-width="2" fill="none"><polygon points="50,15 75,29.4 75,58.3 50,72.7 25,58.3 25,29.4"/><circle cx="50" cy="43.8" r="16" stroke="%23dc2626" stroke-width="1.5"/><line x1="50" y1="15" x2="50" y2="3" stroke="%230f172a"/><text x="50" y="3" font-family="sans-serif" font-size="9" font-weight="bold" fill="%2316a34a" text-anchor="middle">CHO</text></g></svg>`,
  structureC: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80"><rect width="100" height="80" fill="%23ffffff" rx="6"/><g stroke="%230f172a" stroke-width="2" fill="none"><polygon points="50,15 75,29.4 75,58.3 50,72.7 25,58.3 25,29.4"/><circle cx="50" cy="43.8" r="16" stroke="%23dc2626" stroke-width="1.5"/><line x1="50" y1="15" x2="50" y2="3" stroke="%230f172a"/><text x="50" y="3" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="%239333ea" text-anchor="middle">COOH</text></g></svg>`,
  structureD: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80"><rect width="100" height="80" fill="%23ffffff" rx="6"/><g stroke="%230f172a" stroke-width="2" fill="none"><polygon points="50,15 75,29.4 75,58.3 50,72.7 25,58.3 25,29.4"/><circle cx="50" cy="43.8" r="16" stroke="%23dc2626" stroke-width="1.5"/><line x1="50" y1="15" x2="50" y2="3" stroke="%230f172a"/><text x="50" y="3" font-family="sans-serif" font-size="9" font-weight="bold" fill="%23e11d48" text-anchor="middle">NO₂</text></g></svg>`
};

// Initial Seed Mock Tests - Empty (Admin creates real tests manually)
export const INITIAL_MOCK_TESTS: MockTest[] = [];

// Initial Seed Questions - Empty
export const INITIAL_TEST_QUESTIONS: Record<string, MockQuestion[]> = {};

// Populate additional questions up to the test count if needed
export function getStoredMockQuestions(testId: string): MockQuestion[] {
  try {
    const raw = localStorage.getItem(`${MOCK_QUESTIONS_STORAGE_KEY_PREFIX}${testId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading mock questions:', e);
  }
  return [];
}

export function saveStoredMockQuestions(testId: string, questions: MockQuestion[]) {
  try {
    localStorage.setItem(`${MOCK_QUESTIONS_STORAGE_KEY_PREFIX}${testId}`, JSON.stringify(questions));
    window.dispatchEvent(new CustomEvent('neetmbbs_mock_questions_updated', { detail: { testId } }));
  } catch (e) {
    console.error('Error saving mock questions:', e);
  }
}

export function getStoredMockTests(): MockTest[] {
  try {
    const raw = localStorage.getItem(MOCK_TESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip legacy pre-added demo/placeholder tests
        const clean = parsed.filter((t: any) => {
          if (!t || !t.id) return false;
          if (['neet-cbt-01', 'neet-cbt-02', 'neet-cbt-03', 'neet-cbt-04', 'demo-test', 'sample-test'].includes(t.id)) return false;
          if (typeof t.title === 'string' && (t.title.toLowerCase().includes('sample test') || t.title.toLowerCase().includes('demo test'))) return false;
          return true;
        });
        if (clean.length !== parsed.length) {
          localStorage.setItem(MOCK_TESTS_STORAGE_KEY, JSON.stringify(clean));
        }
        return clean;
      }
    }
  } catch (e) {
    console.warn('Error reading mock tests:', e);
  }
  return [];
}

export function saveStoredMockTests(tests: MockTest[]) {
  try {
    localStorage.setItem(MOCK_TESTS_STORAGE_KEY, JSON.stringify(tests));
    window.dispatchEvent(new Event('neetmbbs_mock_tests_updated'));
  } catch (e) {
    console.error('Error saving mock tests:', e);
  }
}

// Purchases
export function getStoredMockPurchases(): MockTestPurchase[] {
  try {
    const raw = localStorage.getItem(MOCK_PURCHASES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveStoredMockPurchase(purchase: MockTestPurchase) {
  try {
    const all = getStoredMockPurchases();
    // Check if already purchased
    const exists = all.some(p => p.testId === purchase.testId && (p.userId === purchase.userId || p.userEmail.toLowerCase() === purchase.userEmail.toLowerCase()));
    if (!exists) {
      all.unshift(purchase);
      localStorage.setItem(MOCK_PURCHASES_STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new Event('neetmbbs_mock_purchases_updated'));
    }
  } catch (e) {
    console.error('Error saving mock purchase:', e);
  }
}

export function hasUserPurchasedMockTest(
  param1?: string | null | any,
  param2?: string | null | any,
  param3?: string
): boolean {
  let resolvedTestId: string | undefined;
  let resolvedUserId: string | null | undefined;
  let resolvedUserEmail: string | null | undefined;

  if (typeof param1 === 'string' && typeof param2 === 'object' && param2 !== null && !param3) {
    // Signature: hasUserPurchasedMockTest(testId, userProfile)
    resolvedTestId = param1;
    resolvedUserId = param2.uid;
    resolvedUserEmail = param2.email;
  } else if (typeof param3 === 'string') {
    // Signature: hasUserPurchasedMockTest(userId, userEmail, testId)
    resolvedUserId = param1;
    resolvedUserEmail = param2;
    resolvedTestId = param3;
  } else if (typeof param1 === 'string' && !param2 && !param3) {
    resolvedTestId = param1;
  }

  if (!resolvedTestId) return false;

  // If price is 0 or test is marked free, it's free/unlocked for everyone
  const allTests = getStoredMockTests();
  const test = allTests.find(t => t.id === resolvedTestId);
  if (test && (test.price === 0 || test.isFree)) return true;

  if (!resolvedUserId && !resolvedUserEmail) return false;
  const purchases = getStoredMockPurchases();
  return purchases.some(p => 
    p.testId === resolvedTestId && 
    (
      (resolvedUserId && p.userId === resolvedUserId) || 
      (resolvedUserEmail && p.userEmail.toLowerCase() === resolvedUserEmail.toLowerCase())
    )
  );
}

// Student Attempts
export function getStoredMockAttempts(): MockTestAttempt[] {
  try {
    const raw = localStorage.getItem(MOCK_ATTEMPTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveStoredMockAttempt(attempt: MockTestAttempt) {
  try {
    const all = getStoredMockAttempts();
    const idx = all.findIndex(a => a.id === attempt.id);
    if (idx > -1) {
      all[idx] = attempt;
    } else {
      all.unshift(attempt);
    }
    localStorage.setItem(MOCK_ATTEMPTS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('neetmbbs_mock_attempts_updated'));
  } catch (e) {
    console.error('Error saving mock attempt:', e);
  }
}

export function getMockTestAttempt(testId: string, userId?: string | null, userEmail?: string | null): MockTestAttempt | null {
  if (!testId || (!userId && !userEmail)) return null;
  const all = getStoredMockAttempts();
  return all.find(a => 
    a.testId === testId && 
    (
      (userId && a.userId === userId) || 
      (userEmail && a.userEmail.toLowerCase() === userEmail.toLowerCase())
    )
  ) || null;
}

export function getAllAttemptsForStudent(userId?: string | null, userEmail?: string | null): MockTestAttempt[] {
  if (!userId && !userEmail) return [];
  const all = getStoredMockAttempts();
  const cleanEmail = (userEmail || '').toLowerCase().trim();
  return all.filter(a => 
    (userId && a.userId === userId) || 
    (cleanEmail && a.userEmail.toLowerCase().trim() === cleanEmail)
  ).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function getAttemptsForTest(testId: string, userId?: string | null, userEmail?: string | null): MockTestAttempt[] {
  const studentAttempts = getAllAttemptsForStudent(userId, userEmail);
  return studentAttempts.filter(a => a.testId === testId);
}

export function canStudentAttemptTest(test: MockTest, userId?: string | null, userEmail?: string | null): {
  allowed: boolean;
  reason?: string;
  attemptCount: number;
} {
  const attempts = getAttemptsForTest(test.id, userId, userEmail).filter(a => a.status === 'submitted');
  const count = attempts.length;

  if (count === 0) {
    return { allowed: true, attemptCount: 0 };
  }

  // Check attempt limit
  const limit = test.attemptLimit || (test.allowMultipleAttempts ? 'unlimited' : 'once');
  if (limit === 'once') {
    return { allowed: false, reason: 'This test is configured for a single attempt only.', attemptCount: count };
  }

  return { allowed: true, attemptCount: count };
}

// Scoring Engine
export function calculateMockTestScore(
  test: MockTest,
  questions: MockQuestion[],
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>
): {
  score: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  subjectScores: {
    Physics: SubjectScoreBreakdown;
    Chemistry: SubjectScoreBreakdown;
    Biology: SubjectScoreBreakdown;
  };
} {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const subjectBreakdown: { [key in MockSubject]: SubjectScoreBreakdown } = {
    Physics: { correct: 0, incorrect: 0, unanswered: 0, score: 0, totalMarks: 0, questionsCount: 0 },
    Chemistry: { correct: 0, incorrect: 0, unanswered: 0, score: 0, totalMarks: 0, questionsCount: 0 },
    Biology: { correct: 0, incorrect: 0, unanswered: 0, score: 0, totalMarks: 0, questionsCount: 0 }
  };

  questions.forEach(q => {
    const subj = q.subject || 'Biology';
    if (!subjectBreakdown[subj]) {
      subjectBreakdown[subj] = { correct: 0, incorrect: 0, unanswered: 0, score: 0, totalMarks: 0, questionsCount: 0 };
    }
    subjectBreakdown[subj].questionsCount += 1;
    subjectBreakdown[subj].totalMarks += test.correctMarks;

    const chosen = answers[q.questionNumber];
    if (!chosen) {
      unansweredCount++;
      subjectBreakdown[subj].unanswered++;
    } else if (chosen === q.correctAnswer) {
      correctCount++;
      subjectBreakdown[subj].correct++;
      subjectBreakdown[subj].score += test.correctMarks;
    } else {
      incorrectCount++;
      subjectBreakdown[subj].incorrect++;
      subjectBreakdown[subj].score -= test.negativeMarks;
    }
  });

  const totalScore = (correctCount * test.correctMarks) - (incorrectCount * test.negativeMarks);
  const attemptedCount = correctCount + incorrectCount;
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

  return {
    score: totalScore,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracy,
    subjectScores: subjectBreakdown
  };
}

// Single Test Leaderboard (Real Completed Attempts Only - ZERO Bot Users)
export function getMockTestLeaderboard(testId: string): MockTestLeaderboardEntry[] {
  const attempts = getStoredMockAttempts().filter(a => a.testId === testId && a.status === 'submitted');
  
  // Sort by score desc, then by timeSpentSeconds asc
  const sorted = [...attempts].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }
    return (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0);
  });

  const test = getStoredMockTests().find(t => t.id === testId);
  const maxMarks = test ? test.maxMarks : 720;

  // Real users only - No hardcoded bot users
  return sorted.map((att, idx) => ({
    rank: idx + 1,
    userId: att.userId,
    userName: att.userName || 'Verified Aspirant',
    score: att.score || 0,
    maxMarks: att.maxMarks || maxMarks,
    accuracy: att.accuracy || 0,
    timeSpentSeconds: att.timeSpentSeconds || 0,
    submittedAt: att.submittedAt || new Date().toISOString(),
    testId: att.testId,
    testTitle: att.testTitle || test?.title
  }));
}

// Combined Main Leaderboard (Combines all eligible mock tests - Real data only)
export function getCombinedMockTestLeaderboard(options?: {
  testId?: string;
  subject?: string;
  timePeriod?: 'all' | 'month' | 'week';
}) {
  const tests = getStoredMockTests();
  const eligibleTests = new Map<string, MockTest>();
  tests.forEach(t => {
    if (t.status === 'published' && t.showLeaderboard !== false) {
      eligibleTests.set(t.id, t);
    }
  });

  const attempts = getStoredMockAttempts().filter(a => {
    if (a.status !== 'submitted') return false;
    if (!eligibleTests.has(a.testId)) return false;
    if (options?.testId && options.testId !== 'all' && a.testId !== options.testId) return false;
    
    // Subject filter if requested
    if (options?.subject && options.subject !== 'all') {
      const t = eligibleTests.get(a.testId);
      if (!t || !t.subjects.includes(options.subject as any)) return false;
    }

    // Time period filter
    if (options?.timePeriod && options.timePeriod !== 'all') {
      const attDate = new Date(a.submittedAt || a.startedAt).getTime();
      const now = Date.now();
      if (options.timePeriod === 'week' && now - attDate > 7 * 86400000) return false;
      if (options.timePeriod === 'month' && now - attDate > 30 * 86400000) return false;
    }

    return true;
  });

  // Aggregate by user
  const studentMap = new Map<string, {
    userId: string;
    userName: string;
    scores: number[];
    accuracies: number[];
    lastAttemptDate: string;
  }>();

  attempts.forEach(att => {
    const key = (att.userId || att.userEmail || '').toLowerCase();
    if (!key) return;

    const existing = studentMap.get(key) || {
      userId: att.userId || key,
      userName: att.userName || 'Verified Aspirant',
      scores: [],
      accuracies: [],
      lastAttemptDate: att.submittedAt || att.startedAt || ''
    };

    if (att.score !== undefined) {
      existing.scores.push(att.score);
    }
    if (att.accuracy !== undefined) {
      existing.accuracies.push(att.accuracy);
    }
    if (att.submittedAt && (!existing.lastAttemptDate || new Date(att.submittedAt) > new Date(existing.lastAttemptDate))) {
      existing.lastAttemptDate = att.submittedAt;
    }

    studentMap.set(key, existing);
  });

  const combined: {
    rank: number;
    userId: string;
    userName: string;
    score: number;
    totalScore: number;
    bestScore: number;
    averageScore: number;
    testsAttempted: number;
    accuracy: number;
    lastAttemptDate: string;
  }[] = [];

  studentMap.forEach((data) => {
    if (data.scores.length === 0) return;
    const totalScore = data.scores.reduce((sum, s) => sum + s, 0);
    const bestScore = Math.max(...data.scores);
    const averageScore = Math.round(totalScore / data.scores.length);
    const avgAccuracy = data.accuracies.length > 0 
      ? Math.round(data.accuracies.reduce((sum, a) => sum + a, 0) / data.accuracies.length) 
      : 0;

    combined.push({
      rank: 0,
      userId: data.userId,
      userName: data.userName,
      score: bestScore,
      totalScore,
      bestScore,
      averageScore,
      testsAttempted: data.scores.length,
      accuracy: avgAccuracy,
      lastAttemptDate: data.lastAttemptDate
    });
  });

  // Sort by best score desc, then by average score desc
  combined.sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    return b.testsAttempted - a.testsAttempted;
  });

  return combined.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}

// Normalize any question object to ensure full bilingual & figure structure
export function normalizeMockQuestion(q: Partial<MockQuestion>, fallbackTestId: string = ''): MockQuestion {
  const qNum = q.questionNumber || 1;
  const enText = q.languages?.en?.questionText || q.questionText || `Question ${qNum}`;
  const enOpts = q.languages?.en?.options || q.options || [];

  // Ensure 4 options (A, B, C, D)
  const standardizedOpts = (['A', 'B', 'C', 'D'] as const).map(lbl => {
    const existing = enOpts.find(o => o.label === lbl);
    if (existing) return existing;
    return {
      label: lbl,
      type: 'text' as const,
      value: `Option ${lbl}`
    };
  });

  const primaryFigure = q.figureUrl || q.questionImageUrl || (q.figures && q.figures[0]) || undefined;

  const enContent = {
    questionText: enText,
    options: standardizedOpts,
    explanation: q.languages?.en?.explanation || q.explanation,
    explanationImageUrl: q.languages?.en?.explanationImageUrl || q.explanationImageUrl
  };

  const hiContent = q.languages?.hi
    ? {
        questionText: q.languages.hi.questionText,
        options: (['A', 'B', 'C', 'D'] as const).map(lbl => {
          const ex = q.languages?.hi?.options?.find(o => o.label === lbl);
          return ex || standardizedOpts.find(o => o.label === lbl)!;
        }),
        explanation: q.languages.hi.explanation || enContent.explanation,
        explanationImageUrl: q.languages.hi.explanationImageUrl
      }
    : undefined;

  return {
    id: q.id || `q_${fallbackTestId || 'test'}_${qNum}_${Math.random().toString(36).substring(2, 7)}`,
    testId: q.testId || fallbackTestId,
    questionNumber: qNum,
    subject: q.subject || (qNum <= 50 ? 'Physics' : qNum <= 100 ? 'Chemistry' : 'Biology'),
    chapter: q.chapter || 'Syllabus Chapter',
    difficulty: q.difficulty || 'Moderate',
    languages: {
      en: enContent,
      hi: hiContent
    },
    figures: q.figures || (primaryFigure ? [primaryFigure] : []),
    figureUrl: primaryFigure,
    questionImageUrl: primaryFigure,
    questionText: enContent.questionText,
    options: enContent.options,
    explanation: enContent.explanation,
    optionFigures: q.optionFigures,
    correctAnswer: q.correctAnswer || 'A',
    marks: q.marks || 4,
    negativeMarks: q.negativeMarks !== undefined ? q.negativeMarks : 1,
    needsReview: q.needsReview || !hiContent
  };
}

/**
 * Gets question text, options, and explanation for the requested language ('en' | 'hi')
 * with graceful fallback to English if Hindi is unavailable.
 */
export function getQuestionDisplayContent(
  question: MockQuestion | undefined | null,
  language: 'en' | 'hi'
): {
  questionText: string;
  options: MockQuestion['options'];
  explanation?: string;
  explanationImageUrl?: string;
  matchTable?: import('../types').MockMatchTable;
  isFallback: boolean;
} {
  if (!question) {
    return {
      questionText: 'Question not available',
      options: [
        { label: 'A', value: 'Option A', type: 'text' },
        { label: 'B', value: 'Option B', type: 'text' },
        { label: 'C', value: 'Option C', type: 'text' },
        { label: 'D', value: 'Option D', type: 'text' }
      ],
      isFallback: false
    };
  }

  const matchTable = (language === 'hi' && question?.languages?.hi?.matchTable)
    ? question?.languages?.hi?.matchTable
    : (question?.languages?.en?.matchTable || question?.matchTable);

  if (language === 'hi' && question?.languages?.hi?.questionText) {
    return {
      questionText: question.languages.hi.questionText,
      options: question.languages.hi.options && question.languages.hi.options.length > 0
        ? question.languages.hi.options
        : (question.options || []),
      explanation: question.languages.hi.explanation || question.explanation,
      explanationImageUrl: question.languages.hi.explanationImageUrl || question.explanationImageUrl,
      matchTable,
      isFallback: false
    };
  }

  // English (or Fallback if Hindi not present)
  const enText = question?.languages?.en?.questionText || question?.questionText || `Question ${question?.questionNumber || 1}`;
  const enOpts = question?.languages?.en?.options || question?.options || [
    { label: 'A', value: 'Option A', type: 'text' },
    { label: 'B', value: 'Option B', type: 'text' },
    { label: 'C', value: 'Option C', type: 'text' },
    { label: 'D', value: 'Option D', type: 'text' }
  ];

  return {
    questionText: enText,
    options: enOpts,
    explanation: question?.languages?.en?.explanation || question?.explanation,
    explanationImageUrl: question?.languages?.en?.explanationImageUrl || question?.explanationImageUrl,
    matchTable,
    isFallback: language === 'hi' // true if student wanted Hindi but only English was available
  };
}

// Copy/Paste Question Text & Markdown File Parser with Bilingual Detection
export function parseQuestionsFromRawText(rawText: string, defaultSubject: MockSubject = 'Biology'): MockQuestion[] {
  // Pre-process text to insert newlines before inline question numbers and options
  let normalizedText = rawText
    // Break before inline question numbers like " 174. ", " 175) ", " Q.176 "
    .replace(/(?:^|\s)(?=(?:Q(?:uestion)?\.?\s*\d{1,3}[\.:)]|\b(?:1\d\d|200|[1-9]\d?)[\.:)]|(?:प्रश्न|प्र\.)\s*\d{1,3}[\.:)]))/gi, '\n')
    // Break before inline options like "(1)", "(2)", "(3)", "(4)" or "(A)", "(B)", "(C)", "(D)"
    .replace(/(?:[ \t]+)(?=\([1-4A-Da-d]\)|\b[1-4A-Da-d]\))/g, '\n');

  const lines = normalizedText.split('\n');
  const questions: MockQuestion[] = [];
  
  let currentQ: Partial<MockQuestion> | null = null;
  let qNum = 1;
  let readingState: 'question' | 'options' | 'explanation' = 'question';

  const pushCurrent = () => {
    if (currentQ && currentQ.questionText && currentQ.options && currentQ.options.length >= 2) {
      // Ensure all 4 options exist
      const existingLabels = new Set(currentQ.options.map(o => o.label));
      (['A', 'B', 'C', 'D'] as const).forEach(lbl => {
        if (!existingLabels.has(lbl)) {
          currentQ!.options!.push({ label: lbl, type: 'text', value: `Option ${lbl}` });
        }
      });
      currentQ.options.sort((a, b) => a.label.localeCompare(b.label));

      const normalized = normalizeMockQuestion(currentQ);
      questions.push(normalized);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Detect markdown or plain question start: "### Q1.", "## 1.", "Q1.", "1.", "Q.1", "Question 1:", "प्रश्न 1", "**Question 1**"
    const qMatch = rawLine.match(/^(?:#{1,4}\s*)?(?:\*{1,2})?(?:Q(?:uestion)?\.?\s*(\d+)[:.]?|(\d+)[:.)]|(?:प्रश्न|प्र\.)\s*(\d+)[:.]?)(?:\*{1,2})?\s*(.*)$/i);
    if (qMatch) {
      pushCurrent();
      const num = parseInt(qMatch[1] || qMatch[2] || qMatch[3], 10);
      const initialText = (qMatch[4] || '').replace(/^\*+|\*+$/g, '').trim();
      currentQ = {
        questionNumber: num || qNum,
        subject: num <= 50 ? 'Physics' : num <= 100 ? 'Chemistry' : defaultSubject,
        questionText: initialText,
        options: [],
        correctAnswer: 'A',
        explanation: '',
        figures: []
      };
      qNum = (num || qNum) + 1;
      readingState = 'question';
      continue;
    }

    // Detect image in question: "![diagram](url)" or "<img src='url'>" or direct image link
    const imgMatch = rawLine.match(/!\[.*?\]\((https?:\/\/[^\s)]+|\/sample_diagrams\/[^\s)]+|data:image\/[^\s)]+)\)/i) ||
                     rawLine.match(/<img[^>]+src=["'](https?:\/\/[^"']+|\/sample_diagrams\/[^"']+|data:image\/[^"']+)["']/i);
    if (imgMatch && currentQ) {
      const imgUrl = imgMatch[1];
      currentQ.figureUrl = imgUrl;
      currentQ.questionImageUrl = imgUrl;
      currentQ.figures = [imgUrl];
      continue;
    }

    // Detect options: "(A)", "A)", "A.", "[A]", "(1)", "1.", "1)", "- (A)", "* **A)**", "**(A)**"
    const optMatch = rawLine.match(/^(?:[-*+]\s+)?(?:\*{1,2})?(?:\(?([1-4A-Da-d])\)?|\b([1-4A-Da-d])\.)(?:\*{1,2})?\s*(.*)$/i);
    if (optMatch && currentQ) {
      readingState = 'options';
      const rawLbl = (optMatch[1] || optMatch[2]).toUpperCase();
      let label: 'A' | 'B' | 'C' | 'D' = 'A';
      if (rawLbl === '1' || rawLbl === 'A') label = 'A';
      else if (rawLbl === '2' || rawLbl === 'B') label = 'B';
      else if (rawLbl === '3' || rawLbl === 'C') label = 'C';
      else if (rawLbl === '4' || rawLbl === 'D') label = 'D';

      const optVal = optMatch[3].replace(/^\*+|\*+$/g, '').trim();
      currentQ.options = currentQ.options || [];
      const existingIdx = currentQ.options.findIndex(o => o.label === label);
      if (existingIdx > -1) {
        currentQ.options[existingIdx].value = optVal;
      } else {
        currentQ.options.push({ label, type: 'text', value: optVal });
      }
      continue;
    }

    // Detect Answer key: "Ans: A", "Answer: (B)", "उत्तर: 2", "Correct: C", "**Answer:** A"
    const ansMatch = rawLine.match(/^(?:\*{1,2})?(?:Ans(?:wer)?|Correct(?:\s*Answer)?|उत्तर)(?:\*{1,2})?\s*[:=-]\s*(?:\*{1,2})?\(?([1-4A-Da-d])\)?(?:\*{1,2})?/i);
    if (ansMatch && currentQ) {
      const rawAns = ansMatch[1].toUpperCase();
      if (rawAns === '1' || rawAns === 'A') currentQ.correctAnswer = 'A';
      else if (rawAns === '2' || rawAns === 'B') currentQ.correctAnswer = 'B';
      else if (rawAns === '3' || rawAns === 'C') currentQ.correctAnswer = 'C';
      else if (rawAns === '4' || rawAns === 'D') currentQ.correctAnswer = 'D';
      continue;
    }

    // Detect Explanation: "Exp:", "Explanation:", "स्पष्टीकरण:", "**Explanation:**"
    const expMatch = rawLine.match(/^(?:\*{1,2})?(?:Exp(?:lanation)?|Sol(?:ution)?|स्पष्टीकरण)(?:\*{1,2})?\s*[:=-]\s*(.*)$/i);
    if (expMatch && currentQ) {
      readingState = 'explanation';
      currentQ.explanation = expMatch[1].trim();
      continue;
    }

    // Continuation of text based on reading state
    if (currentQ) {
      if (readingState === 'question') {
        currentQ.questionText += (currentQ.questionText ? ' ' : '') + rawLine;
      } else if (readingState === 'explanation') {
        currentQ.explanation = (currentQ.explanation ? currentQ.explanation + ' ' : '') + rawLine;
      } else if (readingState === 'options' && currentQ.options && currentQ.options.length > 0) {
        const lastOpt = currentQ.options[currentQ.options.length - 1];
        lastOpt.value = (lastOpt.value ? lastOpt.value + ' ' : '') + rawLine;
      }
    }
  }

  pushCurrent();
  return questions;
}
