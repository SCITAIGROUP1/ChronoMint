/** Convert a local calendar date + HH:MM in `timeZone` to a UTC Date. */
export function localTimeToUtc(localDate: string, localTime: string, timeZone: string): Date {
  const [y, m, d] = localDate.split("-").map(Number);
  const [h, min] = localTime.split(":").map(Number);
  const guess = new Date(Date.UTC(y!, m! - 1, d!, h!, min!, 0, 0));
  let utcMs = guess.getTime();
  for (let i = 0; i < 2; i++) {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(utcMs));
    const match = formatted.match(/(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!match) break;
    const [, lMonth, lDay, lYear, lHour, lMin, lSec] = match;
    const localGenerated = Date.UTC(
      Number(lYear),
      Number(lMonth) - 1,
      Number(lDay),
      Number(lHour),
      Number(lMin),
      Number(lSec)
    );
    const diff = guess.getTime() - localGenerated;
    if (diff === 0) break;
    utcMs += diff;
  }
  return new Date(utcMs);
}

export function addSeconds(date: Date, sec: number) {
  return new Date(date.getTime() + sec * 1000);
}
