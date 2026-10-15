import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../../common/prisma.service';

const BLOCK_TYPES = ['hero', 'texto', 'imagen', 'productos', 'coleccion', 'testimonios', 'faq', 'footer', 'html', 'boton'] as const;
const PAGE_SLUGS = ['home', 'producto', 'checkout', 'confirmacion'] as const;

// Whitelist de props por bloque: nada fuera de aquí se guarda (sin <script>).
const PROP_STRINGS: Record<string, string[]> = {
  hero: ['title', 'subtitle', 'ctaText', 'ctaHref', 'imageUrl', 'align', 'fontFamily', 'titleSize', 'titleColor'],
  texto: ['content', 'align', 'fontFamily', 'fontSize', 'color'],
  imagen: ['imageUrl', 'alt', 'href', 'radius'],
  productos: ['title', 'category', 'limit', 'fontFamily'],
  coleccion: ['title', 'fontFamily'],
  testimonios: ['title', 'items', 'fontFamily'],
  faq: ['title', 'items', 'fontFamily'],
  footer: ['text', 'fontFamily'],
  html: ['code'],
  boton: ['text', 'href', 'variant', 'align', 'fontFamily'],
};
const MAX_LEN: Record<string, number> = { title: 120, subtitle: 200, content: 2000, text: 500, alt: 120, code: 8000 };
const BOTON_VARIANTS = ['primario', 'secundario', 'oferta'] as const;

function sanitizeProps(type: string, props: Record<string, unknown>): Record<string, unknown> {
  const allowed = PROP_STRINGS[type];
  if (!allowed) throw new BadRequestException(`bloque inválido: ${type}`);
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    const v = props[k];
    if (v === undefined) continue;
    if (typeof v !== 'string' && k !== 'items' && k !== 'limit') throw new BadRequestException(`prop inválida: ${k}`);
    if (typeof v === 'string') {
      if (v.length > (MAX_LEN[k] ?? 500)) throw new BadRequestException(`prop muy larga: ${k}`);
      if (k === 'code') {
        if (/<script[\s>]/i.test(v)) throw new BadRequestException('html no permite <script>');
        if (/\son\w+\s*=/i.test(v)) throw new BadRequestException('html no permite handlers on*');
        if (/javascript\s*:/i.test(v)) throw new BadRequestException('html no permite javascript:');
      }
      // Se aceptan https://, rutas / y anclas # (las plantillas usan
      // ctaHref '#catalogo'; el visor las renderiza como enlaces internos).
      if ((k === 'imageUrl' || k === 'href' || k === 'ctaHref') && v && !/^https?:\/\//.test(v) && !v.startsWith('/') && !v.startsWith('#')) {
        throw new BadRequestException(`URL inválida: ${k}`);
      }
      if ((k === 'titleColor' || k === 'color') && v && !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v)) {
        throw new BadRequestException(`color inválido: ${k}`);
      }
      if (k === 'variant' && !(BOTON_VARIANTS as readonly string[]).includes(v)) {
        throw new BadRequestException('variant debe ser primario|secundario|oferta');
      }
      out[k] = v;
    } else {
      out[k] = v; // items (testimonios/faq) / limit validados abajo
    }
  }
  if (out.limit !== undefined && (typeof out.limit !== 'number' || out.limit < 1 || out.limit > 24)) {
    throw new BadRequestException('limit 1-24');
  }
  if (out.items !== undefined && !Array.isArray(out.items)) throw new BadRequestException('items debe ser lista');
  return out;
}

export class CreatePageDto {
  @IsString()
  slug!: string;

  @IsString()
  @MaxLength(80)
  title!: string;
}

export class CreateBlockDto {
  @IsString()
  @IsIn([...BLOCK_TYPES] as string[])
  type!: string;

  @IsObject()
  props!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateBlockDto {
  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class ReorderDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export const STORE_TEMPLATES = ['minimal', 'catalog', 'landing'] as const;
export type StoreTemplate = (typeof STORE_TEMPLATES)[number];

// Bloques por plantilla (F8). Minimal = alta conversión; catalog = multicategoría;
// landing = venta directa en un hilo. Todos usan tipos de bloque ya soportados.
export function templateBlocks(template: string, storeName: string): { type: string; props: Prisma.InputJsonValue; order: number }[] {
  const j = (v: Record<string, unknown>): Prisma.InputJsonValue => v as Prisma.InputJsonValue;
  if (template === 'catalog') {
    return [
      { type: 'hero', props: j({ title: storeName, subtitle: 'Explora el catálogo completo', ctaText: 'Ver productos', ctaHref: '#catalogo' }), order: 0 },
      { type: 'coleccion', props: j({ title: 'Compra por categoría' }), order: 1 },
      { type: 'productos', props: j({ title: 'Destacados', limit: 12 }), order: 2 },
      { type: 'faq', props: j({ title: 'Preguntas frecuentes', items: [{ q: '¿Hacen envíos a todo el país?', a: 'Sí, a toda Colombia.' }, { q: '¿Qué métodos de pago aceptan?', a: 'PSE, tarjeta y Nequi vía Bold.' }] }), order: 3 },
      { type: 'footer', props: j({}), order: 4 },
    ];
  }
  if (template === 'landing') {
    return [
      { type: 'hero', props: j({ title: storeName, subtitle: 'Oferta de lanzamiento por tiempo limitado', ctaText: 'Comprar ahora', ctaHref: '#catalogo' }), order: 0 },
      { type: 'texto', props: j({ content: 'Envío a toda Colombia · Pago 100% seguro · Garantía total', align: 'center' }), order: 1 },
      { type: 'productos', props: j({ title: 'Lo más vendido', limit: 4 }), order: 2 },
      { type: 'testimonios', props: j({ title: 'Lo que dicen nuestros clientes', items: [{ name: 'María G.', text: 'Llegó rapidísimo y tal cual la foto.' }, { name: 'Carlos R.', text: 'El pago fue facilísimo.' }] }), order: 3 },
      { type: 'footer', props: j({}), order: 4 },
    ];
  }
  return [
    { type: 'hero', props: j({ title: storeName, subtitle: 'Compra directa con pago Bold', ctaText: 'Ver productos', ctaHref: '#catalogo' }), order: 0 },
    { type: 'productos', props: j({ title: 'Destacados', limit: 6 }), order: 1 },
    { type: 'texto', props: j({ content: 'Envío a toda Colombia · Pago 100% seguro', align: 'center' }), order: 2 },
  ];
}

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  private assertOwner(tenantId: string, userId: string, role: string) {
    return this.prisma.tenant.findFirstOrThrow({ where: { id: tenantId, ownerId: userId } }).catch(() => {
      if (role !== 'ADMIN') throw new ForbiddenException('solo el dueño de la tienda');
      return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    });
  }

  // Página home por defecto al crear tienda.
  async seedHome(tenantId: string, storeName: string, template = 'minimal') {
    const tpl = (STORE_TEMPLATES as readonly string[]).includes(template) ? template : 'minimal';
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.storePage.findUnique({ where: { tenantId_slug: { tenantId, slug: 'home' } } });
      if (existing) return existing;
      return tx.storePage.create({
        data: {
          tenantId,
          slug: 'home',
          title: 'Inicio',
          status: 'PUBLISHED',
          blocks: { create: templateBlocks(tpl, storeName) },
        },
        include: { blocks: { orderBy: { order: 'asc' } } },
      });
    });
  }

  list(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.storePage.findMany({ where: { tenantId }, include: { _count: { select: { blocks: true } } }, orderBy: { createdAt: 'asc' } }),
    );
  }

  async createPage(tenantId: string, userId: string, role: string, dto: CreatePageDto) {
    await this.assertOwner(tenantId, userId, role);
    const slug = dto.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '') || 'pagina';
    try {
      return await this.prisma.withTenant(tenantId, (tx) =>
        tx.storePage.create({ data: { tenantId, slug, title: dto.title, status: 'DRAFT' } }),
      );
    } catch {
      throw new BadRequestException('esa página ya existe');
    }
  }

  async blocks(tenantId: string, userId: string, role: string, pageId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const page = await tx.storePage.findFirst({ where: { id: pageId, tenantId } });
      if (!page) throw new NotFoundException('página no encontrada');
      return tx.storeBlock.findMany({ where: { pageId }, orderBy: { order: 'asc' } });
    });
  }

  async addBlock(tenantId: string, userId: string, role: string, pageId: string, dto: CreateBlockDto) {
    await this.assertOwner(tenantId, userId, role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const page = await tx.storePage.findFirst({ where: { id: pageId, tenantId } });
      if (!page) throw new NotFoundException('página no encontrada');
      const count = await tx.storeBlock.count({ where: { pageId } });
      return tx.storeBlock.create({
        data: { pageId, type: dto.type, props: sanitizeProps(dto.type, dto.props || {}) as Prisma.InputJsonValue, order: dto.order ?? count },
      });
    });
  }

  async updateBlock(tenantId: string, userId: string, role: string, blockId: string, dto: UpdateBlockDto) {
    await this.assertOwner(tenantId, userId, role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const b = await tx.storeBlock.findFirst({ where: { id: blockId, page: { tenantId } } });
      if (!b) throw new NotFoundException('bloque no encontrado');
      const data: { props?: Prisma.InputJsonValue; order?: number; visible?: boolean } = {};
      if (dto.props !== undefined) data.props = sanitizeProps(b.type, dto.props) as Prisma.InputJsonValue;
      if (dto.order !== undefined) data.order = dto.order;
      if (dto.visible !== undefined) data.visible = dto.visible;
      return tx.storeBlock.update({ where: { id: blockId }, data: data as never });
    });
  }

  async removeBlock(tenantId: string, userId: string, role: string, blockId: string) {
    await this.assertOwner(tenantId, userId, role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const b = await tx.storeBlock.findFirst({ where: { id: blockId, page: { tenantId } } });
      if (!b) throw new NotFoundException('bloque no encontrado');
      await tx.storeBlock.delete({ where: { id: blockId } });
      return { ok: true };
    });
  }

  async setStatus(tenantId: string, userId: string, role: string, pageId: string, status: 'DRAFT' | 'PUBLISHED') {
    await this.assertOwner(tenantId, userId, role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const page = await tx.storePage.findFirst({ where: { id: pageId, tenantId } });
      if (!page) throw new NotFoundException('página no encontrada');
      return tx.storePage.update({ where: { id: pageId }, data: { status } });
    });
  }

  async reorder(tenantId: string, userId: string, role: string, pageId: string, ids: string[]) {
    await this.assertOwner(tenantId, userId, role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const blocks = await tx.storeBlock.findMany({ where: { pageId, page: { tenantId } } });
      const valid = new Set(blocks.map((b) => b.id));
      if (!ids.every((id) => valid.has(id))) throw new BadRequestException('ids inválidos');
      for (const [order, id] of ids.entries()) {
        await tx.storeBlock.update({ where: { id }, data: { order } });
      }
      return tx.storeBlock.findMany({ where: { pageId }, orderBy: { order: 'asc' } });
    });
  }

  // Vitrina pública: bloques visibles de página publicada (sin borradores).
  // El tenant se resolvió por storeSlug (sin RLS); la página se lee con su GUC.
  async publicPage(tenantId: string, slug: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const page = await tx.storePage.findFirst({
        where: { tenantId, slug, status: 'PUBLISHED' },
        include: { blocks: { where: { visible: true }, orderBy: { order: 'asc' } } },
      });
      if (!page) throw new NotFoundException('página no encontrada');
      return page;
    });
  }

  // Visualizador: reemplaza los bloques de la página por una plantilla base.
  async applyTemplate(tenantId: string, userId: string, role: string, pageId: string, template: string) {
    await this.assertOwner(tenantId, userId, role);
    const tpl = (STORE_TEMPLATES as readonly string[]).includes(template) ? template : 'minimal';
    return this.prisma.withTenant(tenantId, async (tx) => {
      const page = await tx.storePage.findFirst({ where: { id: pageId, tenantId } });
      if (!page) throw new NotFoundException('página no encontrada');
      await tx.storeBlock.deleteMany({ where: { pageId } });
      const store = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      await tx.storeBlock.createMany({
        data: templateBlocks(tpl, store.storeName || store.name).map((b) => ({
          pageId,
          type: b.type,
          props: b.props,
          order: b.order,
          visible: true,
        })),
      });
      return tx.storeBlock.findMany({ where: { pageId }, orderBy: { order: 'asc' } });
    });
  }
}

export { PAGE_SLUGS };
