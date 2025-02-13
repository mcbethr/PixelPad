interface EncryptionResult {
  success: boolean;
  message?: string;
  error?: string;
  debug?: string;
}

export class ImageEncryption {
  private static readonly ASCII_MAX = 128; // Standard ASCII range (0-127)

  static async validateImage(file: File): Promise<boolean> {
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

  static async encrypt(message: string, imageData: Uint8Array): Promise<EncryptionResult> {
    // Validate that all characters are ASCII
    if (!message.split('').every(char => char.charCodeAt(0) < this.ASCII_MAX)) {
      return {
        success: false,
        error: 'Message contains non-ASCII characters'
      };
    }

    if (message.length > imageData.length) {
      return {
        success: false,
        error: `Image is too small to encrypt the message. Need ${message.length} bytes, but image has ${imageData.length} bytes`
      };
    }

    try {
      const encrypted = Array.from(message).map((char, index) => {
        const charCode = char.charCodeAt(0);
        const shift = imageData[index] % this.ASCII_MAX;
        // Simple circular shift within ASCII range
        const encryptedCode = (charCode + shift) % this.ASCII_MAX;
        return String.fromCharCode(encryptedCode);
      }).join('');

      return {
        success: true,
        message: encrypted
      };
    } catch (error) {
      return {
        success: false,
        error: 'Encryption failed'
      };
    }
  }

  static async decrypt(encrypted: string, imageData: Uint8Array): Promise<EncryptionResult> {
    if (encrypted.length > imageData.length) {
      return {
        success: false,
        error: `Image is too small to decrypt the message. Need ${encrypted.length} bytes, but image has ${imageData.length} bytes`
      };
    }

    try {
      const decrypted = Array.from(encrypted).map((char, index) => {
        const charCode = char.charCodeAt(0);
        const shift = imageData[index] % this.ASCII_MAX;
        // Reverse the shift within ASCII range
        let decryptedCode = charCode - shift;
        if (decryptedCode < 0) {
          decryptedCode += this.ASCII_MAX;
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
        error: 'Decryption failed'
      };
    }
  }
}