import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair } from '../../src/crypto/keys';
import { signData } from '../../src/crypto/sign';

describe('ED25519 Signing', () => {
  let testKeyPair: { privateKey: string; publicKey: string };

  beforeAll(async () => {
    testKeyPair = await generateKeyPair();
  }, 10000);

  it('should sign data with ED25519', async () => {
    const testData = 'Hello, World!';
    const signature = await signData(testData, testKeyPair.privateKey);
    
    expect(signature).toBeTypeOf('string');
    expect(signature.length).toBeGreaterThan(0);
  });

  it('should sign different data to different signatures', async () => {
    const signature1 = await signData('Data 1', testKeyPair.privateKey);
    const signature2 = await signData('Data 2', testKeyPair.privateKey);
    
    expect(signature1).not.toBe(signature2);
  });

  it('should sign same data consistently', async () => {
    const signature1 = await signData('Consistent Data', testKeyPair.privateKey);
    const signature2 = await signData('Consistent Data', testKeyPair.privateKey);
    
    expect(signature1).toBe(signature2);
  });

  it('should handle empty data', async () => {
    const signature = await signData('', testKeyPair.privateKey);
    
    expect(signature).toBeTypeOf('string');
    expect(signature.length).toBeGreaterThan(0);
  });

  it('should handle large data', async () => {
    const largeData = 'x'.repeat(10000);
    const signature = await signData(largeData, testKeyPair.privateKey);
    
    expect(signature).toBeTypeOf('string');
    expect(signature.length).toBeGreaterThan(0);
  });
});