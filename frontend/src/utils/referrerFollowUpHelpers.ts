import { FOLLOWUP_STATUS, ReferrerFollowUp, ReferrerPopulated } from '@/types';

export function getReferrerDisplayName(
  referrer: ReferrerPopulated | string | undefined
): string {
  if (!referrer || typeof referrer === 'string') return 'Referrer';
  const user = referrer.userId;
  if (user) {
    const name = [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' ');
    if (name) return name;
  }
  return referrer.email || 'Referrer';
}

export function getReferrerIdFromFollowUp(followUp: ReferrerFollowUp): string | undefined {
  if (typeof followUp.referrerId === 'string') return followUp.referrerId;
  return followUp.referrerId?._id;
}

export function categorizeReferrerFollowUps(allFollowUps: ReferrerFollowUp[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayList: ReferrerFollowUp[] = [];
  const missedList: ReferrerFollowUp[] = [];
  const upcomingList: ReferrerFollowUp[] = [];

  allFollowUps.forEach((fu) => {
    const fuDate = new Date(fu.scheduledDate);
    fuDate.setHours(0, 0, 0, 0);

    if (fu.status === FOLLOWUP_STATUS.SCHEDULED) {
      if (fuDate.getTime() === today.getTime()) {
        todayList.push(fu);
      } else if (fuDate < today) {
        missedList.push(fu);
      } else if (fuDate.getTime() === tomorrow.getTime()) {
        upcomingList.push(fu);
      }
    }
  });

  return { todayList, missedList, upcomingList };
}
