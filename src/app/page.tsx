'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { ImageEncryption } from '@/lib/imageEncryption';
import type { DragEvent, ChangeEvent } from 'react';

export default function Home() {
  const [plainText, setPlainText] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptInput, setDecryptInput] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [keyImage, setKeyImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [error, setError] = useState('');

  const handleImageSelect = async (file: File) => {
    if (!await ImageEncryption.validateImage(file)) {
      setError('Invalid image format. Please use JPG, PNG, or WebP.');
      return;
    }
    setKeyImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleDrop = (dragEvent: DragEvent<HTMLDivElement>) => {
    dragEvent.preventDefault();
    const file = dragEvent.dataTransfer.files[0];
    handleImageSelect(file);
  };

  const handleFileInput = (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const file = changeEvent.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleEncrypt = async () => {
    if (!keyImage || !plainText) {
      setError('Please provide both message and key image');
      return;
    }

    try {
      const imageData = await ImageEncryption.getImageData(keyImage);
      const result = await ImageEncryption.encrypt(plainText, imageData);
      
      if (result.success && result.message) {
        setEncryptedText(result.message);
        setError('');
      } else {
        console.error('Encryption debug:', result.debug);
        setError(result.error || 'Encryption failed');
      }
    } catch (err) {
      setError('Encryption failed');
    }
  };

  const handleDecrypt = async () => {
    if (!keyImage || !decryptInput) {
      setError('Please provide both encrypted message and key image');
      return;
    }

    try {
      const imageData = await ImageEncryption.getImageData(keyImage);
      const result = await ImageEncryption.decrypt(decryptInput, imageData);
      
      if (result.success && result.message) {
        setDecryptedText(result.message);
        setError('');
      } else {
        console.error('Decryption debug:', result.debug);
        setError(result.error || 'Decryption failed');
      }
    } catch (err) {
      setError('Decryption failed');
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.panel}>
          <h2>Encrypt</h2>
          <textarea
            value={plainText}
            onChange={(e) => setPlainText(e.target.value)}
            placeholder="Enter message to encrypt"
          />
          <button className={styles.button} onClick={handleEncrypt}>Encrypt</button>
          <textarea
            value={encryptedText}
            readOnly
            placeholder="Encrypted message will appear here"
          />
          <button className={styles.button} onClick={() => {
            setPlainText('');
            setEncryptedText('');
          }}>Clear</button>
        </div>

        <div className={styles.imageSection}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}>
          {imagePreview ? (
            <Image
              src={imagePreview}
              alt="Key image"
              width={200}
              height={200}
              style={{ objectFit: "contain" }}
              unoptimized={true}
            />
          ) : (
            <div className={styles.dropZone}>
              <p>Drag image here or</p>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileInput}
              />
            </div>
          )}
          {imagePreview && (
            <button className={styles.button} onClick={() => {
              setKeyImage(null);
              setImagePreview('');
            }}>Clear Image</button>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.panel}>
          <h2>Decrypt</h2>
          <textarea
            value={decryptInput}
            onChange={(e) => setDecryptInput(e.target.value)}
            placeholder="Enter message to decrypt"
          />
          <button className={styles.button} onClick={handleDecrypt}>Decrypt</button>
          <textarea
            value={decryptedText}
            readOnly
            placeholder="Decrypted message will appear here"
          />
          <button className={styles.button} onClick={() => {
            setDecryptInput('');
            setDecryptedText('');
          }}>Clear</button>
        </div>
      </div>
    </main>
  );
}
