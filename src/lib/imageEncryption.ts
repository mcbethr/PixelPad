interface EncryptionResult {
  success: boolean;
  message?: string;
  error?: string;
  debug?: string;
}

export class ImageEncryption {
  /**
   * Standard ASCII range (0-127)
   */
  static readonly #ASCII_MAX = 128;

  static validateImageType(file: File): boolean {
    if(!file?.type) throw new Error('No file type is found');

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'webp'];
    return validTypes.includes(file.type);
  }

  static async getImageData(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          resolve(uint8Array);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  static encrypt(message: string, imageData: Uint8Array): EncryptionResult {
    const allCharactersAreASCII = message.split('').every(char => char.charCodeAt(0) < this.#ASCII_MAX)
    if (!allCharactersAreASCII) {
      return {
        success: false,
        error: 'Message contains non-ASCII characters'
      };
    }

    if (message.length > imageData.length) {
      return {
        success: false,
        error: `The image is too small to encrypt the message. It need ${message.length} bytes, but has ${imageData.length} bytes`
      };
    }

    try {
      const encrypted = [...message].map((char, index) => {
        const charCode = char.charCodeAt(0);
        const shift = imageData[index] % this.#ASCII_MAX;
        // Simple circular shift within ASCII range
        const encryptedCode = (charCode + shift) % this.#ASCII_MAX;
        return String.fromCharCode(encryptedCode);
      }).join('');

      return {
        success: true,
        message: encrypted
      };
    } catch (error) {
      return {
        success: false,
        error: `Encryption failed ${error}`,
      };
    }
  }

  static decrypt(encrypted: string, imageData: Uint8Array): EncryptionResult {
    if (encrypted.length > imageData.length) {
      return {
        success: false,
        error: `Image is too small to decrypt the message. Need ${encrypted.length} bytes, but image has ${imageData.length} bytes`
      };
    }

    try {
      const decrypted = [...encrypted].map((char, index) => {
        const charCode = char.charCodeAt(0);
        const shift = imageData[index] % this.#ASCII_MAX;
        // Reverse the shift within ASCII range
        let decryptedCode = charCode - shift;
        if (decryptedCode < 0) {
          decryptedCode += this.#ASCII_MAX;
        }
        return String.fromCharCode(decryptedCode);
      }).join('');

      return {
        success: true,
        message: decrypted
      };
    } catch (error) {
      return {
        success: false,
        error: `Decryption failed: ${error}`,
      };
    }
  }
}
