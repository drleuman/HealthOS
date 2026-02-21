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

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('hos_token');
    }

    private getRefreshToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('hos_refresh_token');
    }

    private setTokens(access: string, refresh: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem('hos_token', access);
        localStorage.setItem('hos_refresh_token', refresh);
    }

    private clearTokens(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('hos_token');
        localStorage.removeItem('hos_refresh_token');
    }

    private isRefreshing = false;
    private refreshPromise: Promise<boolean> | null = null;

    private async refresh(): Promise<boolean> {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) return false;

        if (this.isRefreshing) return this.refreshPromise!;

        this.isRefreshing = true;
        this.refreshPromise = (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                    credentials: 'omit',
                });

                if (response.ok) {
                    const data = await response.json();
                    this.setTokens(data.access_token, data.refresh_token);
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

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

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // --- SAFE MUTATION CONFIG ---
        // 1. Ensure Content-Type for all mutations
        const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET');
        if (isMutation && !headers['Content-Type'] && options.body) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                // Option B: Bearer token is immune to 3rd party cookie blocks
                credentials: 'omit',
            });

            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Skip refresh if already attempting logic on auth endpoints
                if (retry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
                    const refreshSucceeded = await this.refresh();
                    if (refreshSucceeded) {
                        return this.request<T>(endpoint, options, false);
                    }
                }

                this.clearTokens();
                if (typeof window !== 'undefined' && !endpoint.includes('/auth/login')) {
                    // LOOP PROTECTION: Don't redirect if already on auth page
                    if (window.location.pathname.includes('/auth')) {
                        throw new Error('Unauthorized');
                    }

                    // LOCALE-AWARE REDIRECT
                    const pathParts = window.location.pathname.split('/').filter(Boolean);
                    const currentLocale = ['es', 'en'].includes(pathParts[0]) ? pathParts[0] : 'es';
                    window.location.href = `/${currentLocale}/auth?returnTo=${encodeURIComponent(window.location.pathname)}`;
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
    async login(email: string): Promise<{ user: any; access_token: string; refresh_token: string }> {
        const response = await this.post<{ user: any; access_token: string; refresh_token: string }>(
            '/auth/login',
            { email },
        );
        if (response.access_token && response.refresh_token) {
            this.setTokens(response.access_token, response.refresh_token);
        }
        return response;
    }

    /**
     * Auth: Check if authenticated
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    /**
     * Auth: Logout
     */
    async logout(): Promise<void> {
        try {
            const refreshToken = this.getRefreshToken();
            await this.post('/auth/logout', { refresh_token: refreshToken });
        } catch (e) {
            // Ignore error
        } finally {
            this.clearTokens();
        }
    }

    /**
     * Assessment: Submit onboarding
     */
    async submitAssessment(data: any): Promise<any> {
        return this.post('/assessment', data);
    }

    /**
     * Tracking: Log business events
     */
    async trackBusinessEvent(event: string, context?: any): Promise<void> {
        try {
            await this.post('/events', { event, context });
        } catch (e) {
            console.error('Failed to track business event', e);
        }
    }

    async trackPaywallClick(feature: string, location: string): Promise<void> {
        return this.trackBusinessEvent('paywall_cta_clicked', { feature, location });
    }

    async trackConversionStart(): Promise<void> {
        return this.trackBusinessEvent('conversion_started', {});
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

    /**
     * Admin: Get dashboard overview
     */
    async adminOverview(period: string = '7d'): Promise<any> {
        return this.get(`/admin/overview?period=${period}`);
    }

    /**
     * Admin: Get users list
     */
    async adminUsers(params: { query?: string; plan?: string; status?: string; page?: number; limit?: number } = {}): Promise<any> {
        const query = new URLSearchParams();
        if (params.query) query.append('query', params.query);
        if (params.plan) query.append('plan', params.plan);
        if (params.status) query.append('status', params.status);
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        return this.get(`/admin/users?${query.toString()}`);
    }

    /**
     * Admin: Get user details
     */
    async adminUserDetail(id: string): Promise<any> {
        return this.get(`/admin/users/${id}`);
    }

    /**
     * Admin: Get user timeline
     */
    async adminUserTimeline(id: string): Promise<any> {
        return this.get(`/admin/users/${id}/timeline`);
    }

    /**
     * Admin: Update user
     */
    async adminUpdateUser(id: string, data: { plan?: string; role?: string; status?: string; metadata?: any }): Promise<any> {
        return this.request(`/admin/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Admin: Revoke sessions
     */
    async adminRevokeSessions(id: string, sessionId?: string): Promise<any> {
        return this.post(`/admin/users/${id}/revoke-sessions`, { sessionId });
    }

    /**
     * Admin: Get events
     */
    async adminEvents(params: { event?: string; feature?: string; userId?: string; period?: string } = {}): Promise<any> {
        const query = new URLSearchParams();
        if (params.event) query.append('event', params.event);
        if (params.feature) query.append('feature', params.feature);
        if (params.userId) query.append('userId', params.userId);
        if (params.period) query.append('period', params.period);
        return this.get(`/admin/events?${query.toString()}`);
    }

    /**
     * Admin: Get system health
     */
    async adminSystem(): Promise<any> {
        return this.get(`/admin/system/health`);
    }

    private updateLastEventTimestamp(): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('healthos_last_event_at', Date.now().toString());
        }
    }
}

// Export singleton instance
export const api = new ApiClient();
