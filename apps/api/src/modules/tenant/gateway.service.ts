import { ForbiddenException, Injectable } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AesService } from '../../common/aes.service';
import { PrismaService } from '../../common/prisma.service';

export class UpdateGatewayDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  boldPublicKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  boldSecretKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  metaAccessToken?: string;
}

function mask(v: string, head = 4, tail = 4): string {
  if (v.length <= head + tail) return '••••';
  return `${v.slice(0, head)}••••${v.slice(-tail)}`;
}

// Las llaves se cifran al guardar y NUNCA salen completas: el GET solo devuelve
// máscara + flags de configuración. Solo MERCHANT/ADMIN puede leer/escribir.
@Injectable()
export class GatewayService {
  constructor(
    private prisma: PrismaService,
    private aes: AesService,
  ) {}

  private assertMerchant(role: string) {
    if (role !== 'MERCHANT' && role !== 'ADMIN') throw new ForbiddenException('solo el comercio administra llaves');
  }

  async getMasked(tenantId: string, role: string) {
    this.assertMerchant(role);
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    return {
      boldPublicKeyMasked: t.boldPubEnc ? mask(this.aes.decrypt(t.boldPubEnc)) : null,
      boldConfigured: !!(t.boldPubEnc && t.boldSecEnc),
      // Meta solo cuenta como conectado con token + cuenta + píxel validados.
      metaConfigured: !!(t.metaTokenEnc && t.metaAdAccount && t.metaPixel),
      metaPending: !!t.metaTokenEnc && !(t.metaAdAccount && t.metaPixel),
    };
  }

  async update(tenantId: string, role: string, dto: UpdateGatewayDto) {
    this.assertMerchant(role);
    const data: { boldPubEnc?: string; boldSecEnc?: string; metaTokenEnc?: string } = {};
    if (dto.boldPublicKey) data.boldPubEnc = this.aes.encrypt(dto.boldPublicKey);
    if (dto.boldSecretKey) data.boldSecEnc = this.aes.encrypt(dto.boldSecretKey);
    if (dto.metaAccessToken) data.metaTokenEnc = this.aes.encrypt(dto.metaAccessToken);
    await this.prisma.tenant.update({ where: { id: tenantId }, data });
    return this.getMasked(tenantId, role);
  }

  // Uso interno del servidor (webhooks, clientes API): descifra bajo demanda, nunca al cliente.
  async getDecrypted(tenantId: string): Promise<{ boldPublicKey: string | null; boldSecretKey: string | null; metaAccessToken: string | null }> {
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    return {
      boldPublicKey: t.boldPubEnc ? this.aes.decrypt(t.boldPubEnc) : null,
      boldSecretKey: t.boldSecEnc ? this.aes.decrypt(t.boldSecEnc) : null,
      metaAccessToken: t.metaTokenEnc ? this.aes.decrypt(t.metaTokenEnc) : null,
    };
  }
}
