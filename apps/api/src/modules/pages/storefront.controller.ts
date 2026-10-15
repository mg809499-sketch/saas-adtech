import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PagesService } from './pages.service';

// Vitrina pública de páginas (solo PUBLISHED + bloques visibles).
@Controller('storefront')
export class StorefrontController {
  constructor(
    private pages: PagesService,
    private prisma: PrismaService,
  ) {}

  @Get(':slug/pages/:page')
  async page(@Param('slug') slug: string, @Param('page') page: string) {
    const t = await this.prisma.tenant.findUnique({ where: { storeSlug: slug.toLowerCase() } });
    if (!t) return { blocks: [] };
    try {
      return await this.pages.publicPage(t.id, page);
    } catch {
      return { blocks: [] };
    }
  }
}
