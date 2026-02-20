import { Controller, Get, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Public } from '../public.decorator';

@Controller('catalog')
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) { }

    @Public()
    @Get('categories')
    async getCategories() {
        return this.catalogService.getCategories();
    }

    @Public()
    @Get('products')
    async getProducts(
        @Query('page') page?: string,
        @Query('perPage') perPage?: string,
        @Query('categoryId') categoryId?: string,
        @Query('search') search?: string,
        @Query('orderby') orderby?: string,
        @Query('order') order?: string,
    ) {
        return this.catalogService.getProducts({
            page: page ? parseInt(page, 10) : 1,
            perPage: perPage ? parseInt(perPage, 10) : 10,
            categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
            search,
            orderby,
            order,
        });
    }

    @Public()
    @Get('products/:slug')
    async getProduct(@Param('slug') slug: string) {
        const product = await this.catalogService.getProductBySlug(slug);
        if (!product) {
            throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
        }
        return product;
    }
}
