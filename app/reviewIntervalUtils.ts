/**
 * Calculate review progress percentage (0-100) based on next practice date
 * This is a frontend-only utility for displaying progress in the donut component.
 * The actual next practice date calculation is done on the backend.
 * 
 * Returns:
 * - 0-100: Progress toward next review (0 = just practiced, 100 = due now)
 * - >100: Overdue (days overdue)
 * - null: Not practiced yet or no next practice date
 */
export function calculateReviewProgress(
  lastPracticed: Date | undefined,
  nextPracticeDate: Date | null
): { progress: number; isOverdue: boolean } | null {
  if (!lastPracticed || !nextPracticeDate) {
    return null;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const lastPracticedDate = new Date(lastPracticed);
  lastPracticedDate.setHours(0, 0, 0, 0);
  
  const nextDate = new Date(nextPracticeDate);
  nextDate.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil((nextDate.getTime() - lastPracticedDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceLastPractice = Math.ceil((now.getTime() - lastPracticedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (totalDays <= 0) {
    return null;
  }

  const progress = (daysSinceLastPractice / totalDays) * 100;
  const isOverdue = now >= nextDate;

  return {
    progress: Math.min(100, Math.max(0, progress)),
    isOverdue,
  };
}

