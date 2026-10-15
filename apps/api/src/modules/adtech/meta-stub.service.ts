import { Injectable } from '@nestjs/common';

// Stub con la misma interfaz del Meta Graph API v20.0: cuando haya credenciales
// reales, este servicio se reemplaza por HttpMetaClient sin tocar el flujo.
@Injectable()
export class MetaStubService {
  private seq = 1000;
  private id(prefix: string) {
    this.seq += 1;
    return `${prefix}_${Date.now()}${this.seq}`;
  }
  // POST /act_<AD_ACCOUNT>/campaigns
  createCampaign(_adAccount: string, _name: string) {
    return { id: this.id('camp') };
  }
  // POST /act_<AD_ACCOUNT>/adsets (+ targeting)
  createAdSet(_adAccount: string, _campaignId: string, _targeting: unknown) {
    return { id: this.id('adset') };
  }
  // POST /act_<AD_ACCOUNT>/ads (creative + anuncio)
  createAd(_adAccount: string, _adsetId: string, _productName: string) {
    return { id: this.id('ad') };
  }
}
