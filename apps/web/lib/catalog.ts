import { api } from './api';
import { loadCommunityCatalog, CommunityCatalog, ProductItem, BlogItem, CourseItem } from '@healthos/shared';

/**
 * Fetches the community catalog, trying the API first and falling back to local static JSON.
 */
export async function getEnhancedCatalog(locale: string): Promise<CommunityCatalog> {
    const staticCatalog = loadCommunityCatalog();

    try {
        // Try to fetch real products from WooCommerce via our API
        const productsResponse = await api.getCatalogProducts({ perPage: 6 });
        const realProducts: ProductItem[] = productsResponse.products.map((p: any) => ({
            id: p.id.toString(),
            slug: p.slug,
            type: "product",
            featured: true,
            priceCents: Math.round(parseFloat(p.price || "0") * 100),
            currency: "EUR",
            title: { es: p.name, en: p.name }, // API currently doesn't provide multi-lang
            excerpt: {
                es: p.shortDescription?.replace(/<[^>]*>/g, '') || '',
                en: p.shortDescription?.replace(/<[^>]*>/g, '') || ''
            },
            image: p.images?.[0] ? { src: p.images[0], alt: { es: p.name, en: p.name } } : undefined
        }));

        // Try to fetch real posts from WordPress via our API
        const blogResponse = await api.getMembershipPosts(1, 6);
        const realBlog: BlogItem[] = blogResponse.posts.map((p: any) => ({
            id: p.id.toString(),
            slug: p.slug,
            type: "blog",
            featured: true,
            readingMinutes: 5, // Estimate or use real metadata if available
            title: { es: p.title.rendered, en: p.title.rendered },
            excerpt: {
                es: p.excerpt.rendered?.replace(/<[^>]*>/g, '') || '',
                en: p.excerpt.rendered?.replace(/<[^>]*>/g, '') || ''
            },
            image: p.featured_media_url ? { src: p.featured_media_url, alt: { es: p.title.rendered, en: p.title.rendered } } : undefined
        }));

        return {
            products: realProducts.length > 0 ? realProducts : staticCatalog.products,
            blog: realBlog.length > 0 ? realBlog : staticCatalog.blog,
            courses: staticCatalog.courses, // Keep static for now as we don't have a courses API yet
        };
    } catch (error) {
        console.warn('[CatalogService] Failed to fetch real-time catalog, falling back to static content', error);
        return staticCatalog;
    }
}
