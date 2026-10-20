const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;
const oneDay = 24 * oneHour;

/**
 * Returns a short human-readable description of the distance between two
 * dates, e.g. "3 days", "5 hours", "10 min". The caller is responsible for
 * prefixing with a verb phrase like "Autorenew in" or "Available in".
 */
export function displayDateDiff(d1: Date, d2: Date): string {
	const diff = Math.abs(d2.getTime() - d1.getTime());
	if (diff >= oneDay) return Math.round(diff / oneDay) + " days";
	if (diff >= oneHour) return Math.round(diff / oneHour) + " hours";
	return Math.floor(diff / oneMinute) + " min";
}
