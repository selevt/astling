/**
 * Formats a date string as a human-readable absolute datetime for use in tooltips.
 * Returns an empty string if the input is missing or invalid.
 */
export function formatAbsoluteDate(dateString: string | undefined): string {
	if (!dateString) return '';
	const date = new Date(dateString);
	if (isNaN(date.getTime())) return '';
	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
}
