import { AesService } from './aes.service';

const config = { getOrThrow: () => 'dev-aes-32-bytes-key-1234567890ab' } as never;

describe('AES-256-GCM', () => {
  it('cifra y descifra (roundtrip)', () => {
    const aes = new AesService(config);
    const enc = aes.encrypt('{"name":"Test"}');
    expect(enc).not.toContain('Test');
    expect(aes.decrypt(enc)).toBe('{"name":"Test"}');
  });
  it('dos cifrados del mismo texto difieren (IV aleatorio)', () => {
    const aes = new AesService(config);
    expect(aes.encrypt('x')).not.toBe(aes.encrypt('x'));
  });
});
