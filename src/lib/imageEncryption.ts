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

private static extractPNGData(imageData: Uint8Array): Uint8Array {
    //https://docs.fileformat.com/image/png/
    // PNG file signature
    const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

    // Validate PNG signature
    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
        if (imageData[i] !== PNG_SIGNATURE[i]) {
            throw new Error("Not a valid PNG file");
        }
    }

    let offset = 8;
    let dataChunks: Uint8Array[] = [];

    const dataView = new DataView(imageData.buffer);
    console.log(imageData.length)
    while (offset < imageData.length) {
        if (offset + 8 > imageData.length) {
          console.log("Out of bounds error, skipping")
          break; // Prevent out-of-bounds error
        }

        // Read chunk length (big-endian)
        const length = dataView.getUint32(offset, false); // `false` for big-endian

        if (offset + 8 + length + 4 > imageData.length){
          console.log("Incorrect boundaries")
          break; // Validate boundaries
        }

        // Read chunk type
        const type = String.fromCharCode(
            imageData[offset + 4],
            imageData[offset + 5],
            imageData[offset + 6],
            imageData[offset + 7]
        );
        console.log(type)

        if (type === "IDAT") {
            // Extract IDAT chunk data
            dataChunks.push(imageData.slice(offset + 8, offset + 8 + length));
        }

        console.log("Length was " + length)
        // Move to the next chunk (Length + Type + Data + CRC)
        offset += 12 + length;
    }

    // Have to merge all IDAT chunks manually, because flat() doesn't work with Uint8Arrays
    const mergedData = new Uint8Array(dataChunks.reduce((acc, chunk) => acc + chunk.length, 0));
    offset = 0;
    for (const chunk of dataChunks) {
        mergedData.set(chunk, offset);
        offset += chunk.length;
    }
    console.log("Final merged data length:", mergedData.length);
    return mergedData;
}

  private static extractJPEGData(uint8Array: Uint8Array): Uint8Array{
    //https://docs.fileformat.com/image/jpeg/
    let offset = 0;
    while (offset < uint8Array.length - 1){
      if(uint8Array[offset] === 0xFF && uint8Array[offset + 1] === 0xDA){
        offset += 2;
        break;
      }
      offset++;
    }
    if (offset >= uint8Array.length - 1) {
      throw new Error("Invalid JPEG file: No SOS marker found");
    }

    return uint8Array.slice(offset);
  }

  private static extractWEBPData(imageData: Uint8Array): Uint8Array{
    //Webp handling is so annoying Google doesn't even tell you how to do it,
    //they just link you to a tool to do it for you...
    //https://docs.fileformat.com/image/webp/
    //https://developers.google.com/speed/webp/
    console.log(Uint8Array)
    return Uint8Array;
  }

  static async getImageData(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          console.log("Got new image to try")

          //JPEGs and JPGs
          if (file.type === "image/jpeg" || file.type === "image/jpg"){
            console.log("Type JPEG");
            resolve(this.extractJPEGData(uint8Array));
            console.log("First few bytes of image data:", uint8Array.slice(0, 10));
            return;
          }

          //PNGs
          if (file.type === "image/png"){
            console.log("Type PNG");
            resolve(this.extractPNGData(uint8Array));
            console.log("First few bytes of image data:", uint8Array.slice(0, 10));
            return;
          }

          //WEBPs
          if (file.type === "image/webp"){
            resolve(this.extractWEBPData(uint8Array));
            console.log("First few bytes of image data:", uint8Array.slice(0, 10));
            return;
          }

          //Backup
          resolve(uint8Array);
        } catch (error) {
          console.log("We got an error")
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
    const PRIME_INCREMENT = 15485863;
    // This prime should probably be larger than 15MB but I don't care. Also needs to be within integer limit unless we want to define custom math
    const imageLength = imageData.length;
    let index = PRIME_INCREMENT % imageLength;//Start at one iteration in, since corners are often less random

    try {
      const encrypted = Array.from(message).map((char) => {
        const charCode = char.charCodeAt(0);
        const shift = imageData[index] % this.ASCII_MAX;
        // Simple circular shift within ASCII range
        const encryptedCode = (charCode + shift) % this.ASCII_MAX;
        //Adjusted the index to hop around the image to increase randomness
        index = (index + PRIME_INCREMENT) % imageLength
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

    const PRIME_INCREMENT = 15485863;
    const imageLength = imageData.length;
    let index = PRIME_INCREMENT % imageLength;

    try {
      const decrypted = Array.from(encrypted).map((char) => {
        const charCode = char.charCodeAt();
        const shift = imageData[index] % this.ASCII_MAX;
        // Reverse the shift within ASCII range
        let decryptedCode = charCode - shift;
        if (decryptedCode < 0) {
          decryptedCode += this.ASCII_MAX;
        }
        index = (index + PRIME_INCREMENT) % imageLength
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