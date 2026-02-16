export type Locale = "es" | "en";

export type CommunityItemBase = {
    id: string;          // canonical id, e.g. "blue_blockers"
    slug: string;        // url slug
    tags?: string[];
    featured?: boolean;
};

export type ProductItem = CommunityItemBase & {
    type: "product";
    priceCents?: number;
    currency?: "EUR" | "USD";
    title: Record<Locale, string>;
    excerpt: Record<Locale, string>;
    why?: Record<Locale, string>;
    image?: { src: string; alt: Record<Locale, string> };
};

export type CourseItem = CommunityItemBase & {
    type: "course";
    modulesCount?: number;
    durationMinutes?: number;
    title: Record<Locale, string>;
    excerpt: Record<Locale, string>;
};

export type BlogItem = CommunityItemBase & {
    type: "blog";
    readingMinutes?: number;
    title: Record<Locale, string>;
    excerpt: Record<Locale, string>;
};

export type CommunityCatalog = {
    products: ProductItem[];
    courses: CourseItem[];
    blog: BlogItem[];
};
