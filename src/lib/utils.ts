import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDaysBetween(date: string) {
  const diffTime = Math.abs(new Date().getTime() - new Date(date).getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getRemainingDays(date: string) {
  const today = new Date();
  const annDate = new Date(date);
  const currentYear = today.getFullYear();
  
  let nextAnn = new Date(currentYear, annDate.getMonth(), annDate.getDate());
  if (nextAnn < today) {
    nextAnn = new Date(currentYear + 1, annDate.getMonth(), annDate.getDate());
  }
  
  const diffTime = nextAnn.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
