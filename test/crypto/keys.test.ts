import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair, importPrivateKey, importPublicKey } from '../../src/crypto/keys';

describe('ED25519 Key Management', () => {
  let testKeyPair: { privateKey: string; publicKey: string };

  beforeAll(async () => {
    testKeyPair = await generateKeyPair();
  }, 10000);

  it('should generate ED25519 key pair', async () => {
    const keyPair = await generateKeyPair();
    
    expect(keyPair).toHaveProperty('privateKey');
    expect(keyPair).toHaveProperty('publicKey');
    expect(typeof keyPair.privateKey).toBe('string');
    expect(typeof keyPair.publicKey).toBe('string');
    expect(keyPair.privateKey.length).toBeGreaterThan(0);
    expect(keyPair.publicKey.length).toBeGreaterThan(0);
  });

  it('should import private key', async () => {
    const privateKey = await importPrivateKey(testKeyPair.privateKey);
    
    expect(privateKey).toBeInstanceOf(CryptoKey);
    expect(privateKey.type).toBe('private');
    expect(privateKey.algorithm.name).toBe('Ed25519');
    expect(privateKey.usages).toContain('sign');
  });

  it('should import public key', async () => {
    const publicKey = await importPublicKey(testKeyPair.publicKey);
    
    expect(publicKey).toBeInstanceOf(CryptoKey);
    expect(publicKey.type).toBe('public');
    expect(publicKey.algorithm.name).toBe('Ed25519');
    expect(publicKey.usages).toContain('verify');
  });

  it('should generate consistent key pairs', async () => {
    const keyPair1 = await generateKeyPair();
    const keyPair2 = await generateKeyPair();
    
    // Different key pairs should have different keys
    expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
  });
});