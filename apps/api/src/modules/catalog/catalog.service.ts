import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateCategoryDto,
  CreateProductDto,
  CreateSizeGuideDto,
  CreateVariantDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './catalog.dto';

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'producto';
}

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string, search?: string, category?: string, take = 50, cursor?: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.product.findMany({
        where: {
          tenantId,
          status: 'PUBLISHED',
          ...(category && category !== 'all' ? { category } : {}),
          ...(search
            ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(take, 1), 100),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { variants: { orderBy: { createdAt: 'asc' } } },
      }),
    );
  }

  bySlug(tenantId: string, slug: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.product.findFirst({
        where: { tenantId, slug, status: 'PUBLISHED' },
        include: { variants: { orderBy: { createdAt: 'asc' } } },
      }),
    );
  }

  private assertMerchant(role: string) {
    if (role !== 'MERCHANT' && role !== 'ADMIN') throw new ForbiddenException('solo el comercio gestiona el catálogo');
  }

  private cleanImages(images?: string[]): string[] | undefined {
    if (images === undefined) return undefined;
    const out = [...new Set(images.map((u) => String(u).trim()).filter(Boolean))].slice(0, 8);
    for (const u of out) {
      if (u.length > 500) throw new BadRequestException('imagen muy larga (máx. 500)');
      if (!/^https?:\/\//.test(u) && !u.startsWith('/')) throw new BadRequestException('imagen debe ser URL https:// o ruta /');
    }
    return out;
  }

  private async assertCategory(tenantId: string, categoryId: string, tx: { category: { findFirst: (a: unknown) => Promise<{ id: string; parentId: string | null } | null> } }) {
    const cat = await tx.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!cat) throw new NotFoundException('categoría no encontrada en tu tienda');
    return cat;
  }

  async create(tenantId: string, role: string, maxProducts: number, dto: CreateProductDto) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      if (maxProducts >= 0) {
        const count = await tx.product.count({ where: { tenantId } });
        if (count >= maxProducts) throw new ForbiddenException('products_limit: tu plan no permite más productos');
      }
      if (dto.categoryId) await this.assertCategory(tenantId, dto.categoryId, tx as never);
      const slug = (dto.slug || slugify(dto.name)).toLowerCase();
      try {
        return await tx.product.create({
          data: {
            tenantId,
            name: dto.name,
            slug,
            sku: dto.sku,
            description: dto.description,
            price: dto.price,
            compareAtPrice: dto.compareAtPrice,
            stock: dto.stock ?? 0,
            category: dto.category ?? 'General',
            categoryId: dto.categoryId,
            imageUrl: dto.imageUrl,
            images: (this.cleanImages(dto.images) ?? []) as never,
            status: 'PUBLISHED',
          },
        });
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        throw new ConflictException('slug o sku duplicado en tu tienda');
      }
    });
  }

  async update(tenantId: string, role: string, id: string, dto: UpdateProductDto) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const p = await tx.product.findFirst({ where: { id, tenantId } });
      if (!p) throw new NotFoundException('producto no encontrado en tu tienda');
      if (dto.categoryId !== undefined && dto.categoryId !== null) {
        await this.assertCategory(tenantId, dto.categoryId, tx as never);
      }
      const { images, ...rest } = dto;
      return tx.product.update({
        where: { id },
        data: {
          ...rest,
          ...(images !== undefined ? { images: (this.cleanImages(images) ?? []) as never } : {}),
          status: dto.status as never,
        },
      });
    });
  }

  async remove(tenantId: string, role: string, id: string) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const p = await tx.product.findFirst({ where: { id, tenantId } });
      if (!p) throw new NotFoundException('producto no encontrado en tu tienda');
      const used = await tx.orderItem.count({ where: { productId: id } });
      if (used > 0) {
        throw new ConflictException('no se puede eliminar: el producto ya tiene órdenes asociadas');
      }
      const inAds = await tx.adCampaign.count({ where: { productId: id } });
      if (inAds > 0) {
        throw new ConflictException('no se puede eliminar: el producto está en campañas de Meta Ads');
      }
      await tx.product.delete({ where: { id } });
      return { deleted: true, id };
    });
  }

  // --- Categorías con subcategorías (árbol de 2 niveles) ---
  categoriesTree(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const all = await tx.category.findMany({ where: { tenantId }, orderBy: [{ order: 'asc' }, { name: 'asc' }] });
      const roots = all.filter((c) => !c.parentId);
      const byParent = new Map<string, typeof all>();
      for (const c of all) {
        if (!c.parentId) continue;
        byParent.set(c.parentId, [...(byParent.get(c.parentId) || []), c]);
      }
      return roots.map((r) => ({ ...r, children: byParent.get(r.id) || [] }));
    });
  }

  async createCategory(tenantId: string, role: string, dto: CreateCategoryDto) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      let parentId: string | null = null;
      if (dto.parentId) {
        const parent = await tx.category.findFirst({ where: { id: dto.parentId, tenantId } });
        if (!parent) throw new NotFoundException('categoría padre no encontrada');
        if (parent.parentId) throw new BadRequestException('máximo 2 niveles: categoría → subcategoría');
        parentId = parent.id;
      }
      const dup = await tx.category.findFirst({ where: { tenantId, parentId, name: dto.name.trim() } });
      if (dup) throw new ConflictException('ya existe esa categoría en este nivel');
      const count = await tx.category.count({ where: { tenantId } });
      return tx.category.create({ data: { tenantId, name: dto.name.trim(), parentId, order: count } });
    });
  }

  async renameCategory(tenantId: string, role: string, id: string, dto: UpdateCategoryDto) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const cat = await tx.category.findFirst({ where: { id, tenantId } });
      if (!cat) throw new NotFoundException('categoría no encontrada');
      const dup = await tx.category.findFirst({
        where: { tenantId, parentId: cat.parentId, name: dto.name.trim(), NOT: { id } },
      });
      if (dup) throw new ConflictException('ya existe esa categoría en este nivel');
      return tx.category.update({ where: { id }, data: { name: dto.name.trim() } });
    });
  }

  async removeCategory(tenantId: string, role: string, id: string) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const cat = await tx.category.findFirst({ where: { id, tenantId } });
      if (!cat) throw new NotFoundException('categoría no encontrada');
      const kids = await tx.category.count({ where: { parentId: id } });
      if (kids > 0) throw new ConflictException('tiene subcategorías: elimínalas primero');
      const used = await tx.product.count({ where: { categoryId: id } });
      if (used > 0) throw new ConflictException(`la usan ${used} producto(s): reasigna primero`);
      await tx.category.delete({ where: { id } });
      return { deleted: true, id };
    });
  }

  // --- Variantes (color/talla) con stock propio ---
  private async assertProduct(tenantId: string, productId: string, tx: { product: { findFirst: (a: unknown) => Promise<{ id: string } | null> } }) {
    const p = await tx.product.findFirst({ where: { id: productId, tenantId } });
    if (!p) throw new NotFoundException('producto no encontrado en tu tienda');
    return p;
  }

  variants(tenantId: string, productId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.assertProduct(tenantId, productId, tx as never);
      return tx.productVariant.findMany({ where: { productId }, orderBy: { createdAt: 'asc' } });
    });
  }

  async createVariant(tenantId: string, role: string, productId: string, dto: CreateVariantDto) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.assertProduct(tenantId, productId, tx as never);
      if (!dto.color && !dto.size) throw new BadRequestException('indica color y/o talla');
      return tx.productVariant.create({
        data: { productId, color: dto.color, size: dto.size, sku: dto.sku, priceDelta: dto.priceDelta ?? 0, stock: dto.stock ?? 0 },
      });
    });
  }

  async updateVariant(tenantId: string, role: string, id: string, dto: UpdateVariantDto) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const v = await tx.productVariant.findFirst({ where: { id, product: { tenantId } } });
      if (!v) throw new NotFoundException('variante no encontrada');
      return tx.productVariant.update({ where: { id }, data: { ...dto } });
    });
  }

  async removeVariant(tenantId: string, role: string, id: string) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const v = await tx.productVariant.findFirst({ where: { id, product: { tenantId } } });
      if (!v) throw new NotFoundException('variante no encontrada');
      const used = await tx.orderItem.count({ where: { variantId: id } });
      if (used > 0) throw new ConflictException('la variante ya tiene órdenes: consérvala para el historial');
      await tx.productVariant.delete({ where: { id } });
      return { deleted: true, id };
    });
  }

  // --- Guías de tallas (ropa, calzado, custom) ---
  sizeGuides(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.sizeGuide.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    );
  }

  async createSizeGuide(tenantId: string, role: string, dto: CreateSizeGuideDto) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const table = dto.table ?? {};
      if (typeof table !== 'object' || table === null) throw new BadRequestException('table debe ser objeto o lista');
      const dup = await tx.sizeGuide.findFirst({ where: { tenantId, name: dto.name.trim() } });
      if (dup) throw new ConflictException('ya existe una guía con ese nombre');
      return tx.sizeGuide.create({
        data: { tenantId, name: dto.name.trim(), kind: dto.kind ?? 'custom', table: table as never },
      });
    });
  }

  async removeSizeGuide(tenantId: string, role: string, id: string) {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const g = await tx.sizeGuide.findFirst({ where: { id, tenantId } });
      if (!g) throw new NotFoundException('guía no encontrada');
      await tx.sizeGuide.delete({ where: { id } });
      return { deleted: true, id };
    });
  }
}
