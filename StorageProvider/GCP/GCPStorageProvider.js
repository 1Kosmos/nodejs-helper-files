class GCPStorageProvider {
  /**
   * GCPStorageProvider constructor
   * @param {Object} gcpCloudStorageClient - GCP Cloud Storage Client instance
   * @param {string} cloudBucketName - The bucket name to store data under
   */
  constructor(gcpCloudStorageClient, cloudBucketName) {
    if (!gcpCloudStorageClient) {
      throw new Error('GCP Cloud Storage client is required.');
    }
    if (!cloudBucketName) {
      throw new Error('Bucket name is required for GCPStorageProvider.');
    }
    this.gcpCloudStorageClient = gcpCloudStorageClient;
    this.cloudBucketName = cloudBucketName;
    console.log(`GCPStorageProvider initialized with bucket: ${cloudBucketName}`);
  }

  /**
   * Upload contents to a specified file path
   * @param {Buffer|string} contents - The contents to upload
   * @param {string} filePath - The file path (including file name) where the content will be uploaded
   * @returns {Promise<void>} - Resolves on successful upload
   */
  async upload(contents, filePath) {
    if (!contents || !filePath) {
      throw new Error('Both contents and filePath are required for upload.');
    }
    try {
      const file = this.gcpCloudStorageClient.bucket(this.cloudBucketName).file(filePath);
      await file.save(contents.buffer);
      const publicUrl = `https://storage.googleapis.com/${this.cloudBucketName}/${filePath}`;
      console.log(`Upload successful: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      const errorMessage = `Failed to upload file to GCP storage: ${error.message}`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Deletes the file at a specified file path
   * @param {string} filePath - The file path (including file name) to delete
   * @returns {Promise<void>} - Resolves if deletion is successful
   */
  async deleteFile(filePath) {
    if (!filePath) {
      throw new Error('File path is required for deleteFile.');
    }
    try {
      const file = this.gcpCloudStorageClient.bucket(this.cloudBucketName).file(filePath);
      await file.delete();
    } catch (error) {
      if (error.code !== 404) {
        const errorMessage = `Failed to delete file from GCP storage: ${error.message}`;
        throw new Error(errorMessage);
      }
      console.warn(`File not found (no deletion needed): ${filePath}`);
    }
  }
}

module.exports = GCPStorageProvider;
