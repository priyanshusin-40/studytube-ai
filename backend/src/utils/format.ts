export function formatTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return hours > 0
    ? [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':')
    : [minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}
