import CryptoJS from 'crypto-js';

// Generate a random encryption key
export const generateEncryptionKey = (): string => {
  return CryptoJS.lib.WordArray.random(256 / 8).toString();
};

// Encrypt data with AES
export const encryptData = (data: string, key: string): string => {
  return CryptoJS.AES.encrypt(data, key).toString();
};

// Decrypt data with AES
export const decryptData = (encryptedData: string, key: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Hash the encryption key for storage (for verification)
export const hashKey = (key: string): string => {
  return CryptoJS.SHA256(key).toString();
};

// Verify if a key matches the stored hash
export const verifyKey = (key: string, hash: string): boolean => {
  return hashKey(key) === hash;
};

// Encrypt file content before upload
export const encryptFile = async (file: File, key: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as ArrayBuffer;
      const wordArray = CryptoJS.lib.WordArray.create(content);
      const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
      resolve(encrypted);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Decrypt file content after download
export const decryptFile = (encryptedContent: string, key: string): Uint8Array => {
  const decrypted = CryptoJS.AES.decrypt(encryptedContent, key);
  const wordArray = decrypted;
  const typedArray = new Uint8Array(wordArray.sigBytes);
  
  for (let i = 0; i < wordArray.sigBytes; i++) {
    typedArray[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  
  return typedArray;
};

// Generate a secure document encryption key based on user and document
export const generateDocumentKey = (userId: string, documentId: string): string => {
  const combined = `${userId}-${documentId}-${Date.now()}`;
  return CryptoJS.SHA256(combined).toString();
};