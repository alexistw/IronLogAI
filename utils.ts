import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAYS_OF_WEEK = ['Mon 週一', 'Tue 週二', 'Wed 週三', 'Thu 週四', 'Fri 週五', 'Sat 週六', 'Sun 週日'];

// Get the Monday of the current week (or the week containing the date)
export const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const getWeekId = (date: Date): string => {
  const monday = getMonday(date);
  return monday.toISOString().split('T')[0]; // YYYY-MM-DD of the Monday
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};