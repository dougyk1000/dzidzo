import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function cacheImage(url: string, key: string): Promise<string> {
  const cached = localStorage.getItem(`dzidzo_img_${key}`);
  if (cached) return cached;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        try {
          localStorage.setItem(`dzidzo_img_${key}`, base64data);
        } catch (e) {
          console.warn('LocalStorage full, could not cache image');
        }
        resolve(base64data);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to cache image:', error);
    return url;
  }
}

export function getCachedImage(key: string): string | null {
  return localStorage.getItem(`dzidzo_img_${key}`);
}
