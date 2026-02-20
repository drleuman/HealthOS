import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

export interface CatalogProduct {
    id: number;
    slug: string;
    name: string;
    price: string;
    regularPrice: string;
    salePrice: string;
    currency: string;
    images: string[];
    shortDescription?: string;
    descriptionHtml?: string;
    type: string;
    stockStatus: string;
    categories: { id: number; name: string; slug: string }[];
    buyUrl: string;
    permalink: string;
    attributes?: any[];
    variations?: any[];
}

@Injectable()
export class CatalogService {
    private readonly logger = new Logger(CatalogService.name);
    private readonly cache = new Map<string, { data: any; expires: number }>();
    private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    constructor(private config: ConfigService) { }

    private get wcConfig() {
        return {
            baseUrl: this.config.get<string>('WC_BASE_URL', 'https://mithohacks.com'),
            key: this.config.get<string>('WC_CONSUMER_KEY'),
            secret: this.config.get<string>('WC_CONSUMER_SECRET'),
            version: this.config.get<string>('WC_API_VERSION', 'v3'),
            checkoutUrl: this.config.get<string>('WC_CHECKOUT_URL', 'https://mithohacks.com/pago/'),
        };
    }

    private async wcRequest(endpoint: string) {
        const { baseUrl, key, secret, version } = this.wcConfig;
        const url = `${baseUrl}/wp-json/wc/${version}${endpoint}`;

        const cacheKey = url;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }

        const auth = Buffer.from(`${key}:${secret}`).toString('base64');
        const response = await fetch(url, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        if (!response.ok) {
            this.logger.error(`WooCommerce API Error: ${response.status} ${response.statusText} on ${url}`);
            throw new Error(`WooCommerce API Error: ${response.status}`);
        }

        const data = await response.json();
        const total = response.headers.get('X-WP-Total');
        const totalPages = response.headers.get('X-WP-TotalPages');

        const result = { data, total: total ? parseInt(total, 10) : 0, totalPages: totalPages ? parseInt(totalPages, 10) : 1 };

        this.cache.set(cacheKey, { data: result, expires: Date.now() + this.CACHE_TTL });
        return result;
    }

    async getCategories() {
        const result = await this.wcRequest('/products/categories?per_page=100');
        return result.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            count: c.count,
            image: c.image?.src,
            parent: c.parent,
        }));
    }

    async getProducts(params: {
        page?: number;
        perPage?: number;
        categoryId?: number;
        search?: string;
        orderby?: string;
        order?: string;
    }) {
        const query = new URLSearchParams({
            status: 'publish',
            page: (params.page || 1).toString(),
            per_page: (params.perPage || 10).toString(),
            orderby: params.orderby || 'date',
            order: params.order || 'desc',
        });

        if (params.categoryId) query.append('category', params.categoryId.toString());
        if (params.search) query.append('search', params.search);

        const result = await this.wcRequest(`/products?${query.toString()}`);
        return {
            products: result.data.map((p: any) => this.normalizeProduct(p)),
            pagination: {
                page: params.page || 1,
                perPage: params.perPage || 10,
                total: result.total,
                totalPages: result.totalPages,
            },
        };
    }

    async getProductBySlug(slug: string) {
        const result = await this.wcRequest(`/products?slug=${slug}`);
        if (!result.data || result.data.length === 0) return null;

        const product = result.data[0];
        let variations = [];

        if (product.type === 'variable') {
            const varsResult = await this.wcRequest(`/products/${product.id}/variations?per_page=100`);
            variations = varsResult.data;
        }

        return this.normalizeProduct(product, variations);
    }

    private normalizeProduct(p: any, variations?: any[]): CatalogProduct {
        const { checkoutUrl } = this.wcConfig;

        let buyUrl = p.permalink;
        if (p.type === 'simple' && p.purchasable && p.stock_status !== 'outofstock') {
            buyUrl = `${checkoutUrl}?add-to-cart=${p.id}`;
        }

        return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            price: p.price,
            regularPrice: p.regular_price,
            salePrice: p.sale_price,
            currency: '€', // WooCommerce typically returns numeric strings, assuming EUR for mithohacks
            images: p.images?.map((img: any) => img.src) || [],
            shortDescription: p.short_description,
            descriptionHtml: p.description,
            type: p.type,
            stockStatus: p.stock_status,
            categories: p.categories?.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })) || [],
            buyUrl,
            permalink: p.permalink,
            attributes: p.attributes,
            variations: variations?.map(v => ({
                id: v.id,
                price: v.price,
                regularPrice: v.regular_price,
                salePrice: v.sale_price,
                attributes: v.attributes,
                stockStatus: v.stock_status,
                buyUrl: v.stock_status !== 'outofstock' ? `${checkoutUrl}?add-to-cart=${v.id}` : v.permalink
            }))
        };
    }
}
