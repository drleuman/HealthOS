/**
 * WordPress API Client for Comunidad Descentra
 * 
 * This client fetches membership posts and individual entries from the WordPress site.
 */

const WP_API_URL = 'https://comunidaddescentra.com/wp-json/wp/v2';
const MEMBERSHIP_CATEGORY_ID = 65;

export interface WordPressPost {
    id: number;
    date: string;
    slug: string;
    link: string;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
        protected: boolean;
    };
    excerpt: {
        rendered: string;
        protected: boolean;
    };
    featured_media_url?: string;
}

export interface WordPressResponse<T> {
    data: T;
    total: number;
    totalPages: number;
}

class WordPressClient {
    /**
     * Generic request handler for WordPress API
     */
    private async request<T>(endpoint: string): Promise<WordPressResponse<T>> {
        const url = `${WP_API_URL}${endpoint}`;

        try {
            const response = await fetch(url, {
                // We use a small revalidation window to keep content fresh but avoid hitting WP on every request
                next: { revalidate: 3600 }
            });

            if (!response.ok) {
                throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json();

            // Extract data and normalize featured media URL if embedded
            const normalizePost = (post: any): WordPressPost => ({
                id: post.id,
                date: post.date,
                slug: post.slug,
                link: post.link,
                title: post.title,
                content: post.content,
                excerpt: post.excerpt,
                featured_media_url: post._embedded?.['wp:featuredmedia']?.[0]?.source_url
            });

            const data = Array.isArray(rawData)
                ? rawData.map(normalizePost)
                : normalizePost(rawData);

            return {
                data: data as T,
                total: parseInt(response.headers.get('X-WP-Total') || '0'),
                totalPages: parseInt(response.headers.get('X-WP-TotalPages') || '0'),
            };
        } catch (error) {
            console.error('Error fetching from WordPress:', error);
            throw error;
        }
    }

    /**
     * Fetch membership posts (Category 65)
     * 
     * @param page Page number
     * @param perPage Number of posts per page (max 100)
     * @returns Paginated posts
     */
    async getMembershipPosts(page = 1, perPage = 10): Promise<WordPressResponse<WordPressPost[]>> {
        const query = new URLSearchParams({
            categories: MEMBERSHIP_CATEGORY_ID.toString(),
            per_page: perPage.toString(),
            page: page.toString(),
            _embed: '1',
            orderby: 'date',
            order: 'desc'
        });

        return this.request<WordPressPost[]>(`/posts?${query.toString()}`);
    }

    /**
     * Fetch a single membership post by its slug
     * 
     * @param slug The post slug
     * @returns The post or null if not found
     */
    async getPostBySlug(slug: string): Promise<WordPressPost | null> {
        const query = new URLSearchParams({
            categories: MEMBERSHIP_CATEGORY_ID.toString(),
            slug,
            _embed: '1'
        });

        const response = await this.request<WordPressPost[]>(`/posts?${query.toString()}`);
        return Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;
    }
}

export const wpClient = new WordPressClient();
