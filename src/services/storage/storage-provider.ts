export interface StorageProvider {
  /**
   * Uploads a file (Buffer or String) to the provided path.
   */
  upload(path: string, content: Buffer | string, contentType?: string): Promise<string>;

  /**
   * Downloads a file from the provided path as a Buffer.
   */
  download(path: string): Promise<Buffer>;

  /**
   * Deletes a file at the provided path.
   */
  delete(path: string): Promise<void>;

  /**
   * Generates a signed URL if supported, or a public URL.
   */
  getPublicUrl(path: string): Promise<string>;
}
