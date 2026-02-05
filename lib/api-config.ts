/**
 * API Configuration
 * Uses environment variable for production, falls back to localhost for development
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Helper to construct API endpoints
 */
export function apiUrl(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}
