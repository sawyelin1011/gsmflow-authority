import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair } from '../../src/crypto/keys';
import { signData } from '../../src/crypto/sign';
import { verifySignature, verifySignatureOrThrow } from '../../src/crypto/verify';

describe('ED25519 Signature Verification', () => {
  let testKeyPair: { privateKey: string; publicKey: string };

  beforeAll(async () => {
    testKeyPair = await generateKeyPair();
  }, 10000);

  it('should verify valid signature', async () => {
    const testData = 'Test Data for Verification';
    const signature = await signData(testData, testKeyPair.privateKey);
    
    const isValid = await verifySignature(testData, signature, testKeyPair.publicKey);
    
    expect(isValid).toBe(true);
  });

  it('should reject invalid signature', async () => {
    const testData = 'Test Data';
    const signature = await signData(testData, testKeyPair.privateKey);
    
    // Tamper with the data
    const tamperedData = testData + 'tampered';
    const isValid = await verifySignature(tamperedData, signature, testKeyPair.publicKey);
    
    expect(isValid).toBe(false);
  });

  it('should reject signature from different key', async () => {
    const otherKeyPair = await generateKeyPair();
    const testData = 'Test Data';
    const signature = await signData(testData, otherKeyPair.privateKey);
    
    const isValid = await verifySignature(testData, signature, testKeyPair.publicKey);
    
    expect(isValid).toBe(false);
  });

  it('should reject malformed signature', async () => {
    const testData = 'Test Data';
    const malformedSignature = 'invalid-base64-signature!@#';

    const isValid = await verifySignature(testData, malformedSignature, testKeyPair.publicKey);

    expect(isValid).toBe(false);
  });

  it('should throw on invalid signature with verifySignatureOrThrow', async () => {
    const testData = 'Test Data';
    const signature = await signData(testData, testKeyPair.privateKey);
    const tamperedData = testData + 'tampered';
    
    await expect(
      verifySignatureOrThrow(tamperedData, signature, testKeyPair.publicKey)
    ).rejects.toThrow('Invalid signature');
  });

  it('should not throw on valid signature with verifySignatureOrThrow', async () => {
    const testData = 'Valid Test Data';
    const signature = await signData(testData, testKeyPair.privateKey);
    
    await expect(
      verifySignatureOrThrow(testData, signature, testKeyPair.publicKey)
    ).resolves.not.toThrow();
  });
});;
    
    const isValid = await verifySignature(testData, malformedSignature, testKeyPair.publicKey);
    
    expect(isValid).toBe(false);
  });

  it('should throw on invalid signature with verifySignatureOrThrow', async () => {
    const testData = 'Test Data';
    const signature = await signData(testData, testKeyPair.privateKey);
    const tamperedData = testData + 'tampered';
    
    await expect(
      verifySignatureOrThrow(tamperedData, signature, testKeyPair.publicKey)
    ).rejects.toThrow('Invalid signature');
  });

  it('should not throw on valid signature with verifySignatureOrThrow', async () => {
    const testData = 'Valid Test Data';
    const signature = await signData(testData, testKeyPair.privateKey);
    
    await expect(
      verifySignatureOrThrow(testData, signature, testKeyPair.publicKey)
    ).resolves.not.toThrow();
  });
});