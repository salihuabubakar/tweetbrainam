// <input type="datetime-local"> speaks local wall-clock time with no zone, so
// both directions go through the browser's own timezone — which is the one the
// user is reading the slot time in.
export function toLocalInput(value: string | Date): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
