/**
 * API Client for HealthOS
 * Handles authentication, retries, and error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

interface ApiError {
    statusCode: number;
    message: string;
    error?: string;
}

class ApiClient {
    constructor() { }

    /**
     * Make authenticated request
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        retry = true,
    ): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
        };

        // ZERO-PREFLIGHT CRITICAL:
        // Do NOT send Content-Type on GET requests, or it effectively becomes a "non-simple" request 
        // and triggers a preflight (OPTIONS), defeating the purpose.
        if (options.method !== 'GET' && options.method !== 'HEAD' && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
            });

            // Handle 401 Unauthorized
            if (response.status === 401) {
                // this.clearToken(); // No local token to clear
                if (typeof window !== 'undefined') {
                    window.location.href = '/auth';
                }
                throw new Error('Unauthorized');
            }

            // Handle other errors
            if (!response.ok) {
                const error: ApiError = await response.json().catch(() => ({
                    statusCode: response.status,
                    message: response.statusText,
                }));
                throw new Error(error.message || 'Request failed');
            }

            return response.json();
        } catch (error) {
            // Retry once on network error
            if (retry && error instanceof TypeError) {
                return this.request<T>(endpoint, options, false);
            }
            throw error;
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * Auth: Login
     */
    async login(email: string): Promise<{ user: any }> {
        const response = await this.post<{ user: any }>(
            '/auth/login',
            { email },
        );
        // Token is now HttpOnly cookie set by server
        return response;
    }

    /**
     * Auth: Check if authenticated
     */
    isAuthenticated(): boolean {
        // Optimistic: Assume authenticated (Cookie-based). 
        // 401 response will trigger redirect to /auth
        return true;
    }

    /**
     * Auth: Logout
     */
    async logout(): Promise<void> {
        try {
            await this.post('/auth/logout');
        } catch (e) {
            console.error('Logout failed', e);
        }
    }

    /**
     * Assessment: Submit onboarding
     */
    async submitAssessment(data: any): Promise<any> {
        return this.post('/assessment', data);
    }

    /**
     * User: Get today's tasks
     */
    async getToday(): Promise<any> {
        return this.get('/user/today');
    }

    /**
     * User: Get route/progress
     */
    async getRoute(): Promise<any> {
        return this.get('/user/route');
    }

    /**
     * User: Log day completion
     */
    async logDay(data: { day: number; action_completed: boolean; self_report_effect?: string }): Promise<any> {
        return this.post('/user/day-log', data);
    }

    /**
     * Community: Get membership posts (Category 65)
     */
    async getMembershipPosts(page = 1, perPage = 10): Promise<{ posts: any[], pagination: any }> {
        return this.get(`/community/membership?page=${page}&perPage=${perPage}`);
    }

    /**
     * Community: Get single membership post by slug
     */
    async getMembershipPost(slug: string): Promise<any> {
        return this.get(`/community/membership/${slug}`);
    }

    /**
     * Catalog: Get categories from WooCommerce
     */
    async getCatalogCategories(): Promise<any[]> {
        return this.get('/catalog/categories');
    }

    /**
     * Catalog: Get products with optional filters
     */
    async getCatalogProducts(params: { page?: number; perPage?: number; categoryId?: number; search?: string } = {}): Promise<{ products: any[], pagination: any }> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.perPage) query.append('perPage', params.perPage.toString());
        if (params.categoryId) query.append('categoryId', params.categoryId.toString());
        if (params.search) query.append('search', params.search);

        return this.get(`/catalog/products?${query.toString()}`);
    }

    /**
     * Catalog: Get single product by slug
     */
    async getCatalogProduct(slug: string): Promise<any> {
        return this.get(`/catalog/products/${slug}`);
    }

    /**
     * Auth: Generate SSO token for Mithohacks
     */
    async getSsoLink(redirectUrl?: string): Promise<string> {
        const response = await this.get<{ token: string; url?: string }>(
            redirectUrl
                ? `/auth/sso-token?redirect=${encodeURIComponent(redirectUrl)}`
                : '/auth/sso-token'
        );
        // Construct final URL if API returns token, or use full URL if provided
        return response.url || `https://mithohacks.com/sso/login?token=${response.token}`;
    }

    /**
     * Events: Track event (fire-and-forget)
     */
    trackEvent(event: string, context?: any, meta?: any): void {
        this.updateLastEventTimestamp();
        // Fire and forget - don't wait for response
        this.post('/events', {
            event,
            // userId is determined by server based on auth token
            context,
            meta: {
                platform: 'web',
                version: '1.0.0',
                ...meta,
            },
        }).catch((error) => {
            // Silent fail - tracking should never break UX
            console.warn('Failed to track event:', event, error);
        });
    }

    /**
     * Deduplicated app_opened tracking (Time-window + Inactivity gap)
     */
    trackAppOpened(): void {
        if (typeof window === 'undefined') return;

        const now = Date.now();
        const lastOpenedKey = 'healthos_last_app_opened';
        const lastAnyEventKey = 'healthos_last_event_at';

        const lastOpened = parseInt(localStorage.getItem(lastOpenedKey) || '0');
        const lastEvent = parseInt(localStorage.getItem(lastAnyEventKey) || '0');

        // Gap rule: If more than 2h since last activity, it's a new entry even if it's a reload
        const isNewEntryAfterGap = (now - lastEvent) > 2 * 60 * 60 * 1000;

        // Dedupe rule: Don't fire more than once every 5 minutes 
        const isWithinDedupeWindow = (now - lastOpened) < 5 * 60 * 1000;

        if (isNewEntryAfterGap || !isWithinDedupeWindow) {
            this.trackEvent('app_opened');
            localStorage.setItem(lastOpenedKey, now.toString());
        }
    }

    private updateLastEventTimestamp(): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('healthos_last_event_at', Date.now().toString());
        }
    }
}

// Export singleton instance
export const api = new ApiClient();
