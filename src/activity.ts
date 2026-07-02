export function formatActivityTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time unknown";
  }

  const now = new Date();
  const startToday = startOfDay(now);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startThreeDaysAgo = new Date(startToday);
  startThreeDaysAgo.setDate(startThreeDaysAgo.getDate() - 3);
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);

  if (date >= startToday) {
    return `Today at ${time}`;
  }

  if (date >= startYesterday) {
    return `Yesterday at ${time}`;
  }

  if (date >= startThreeDaysAgo) {
    const days = Math.max(2, Math.round((startToday.getTime() - startOfDay(date).getTime()) / 86400000));
    return `${days} days ago at ${time}`;
  }

  return `${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(date)} at ${time}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
