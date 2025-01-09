const GCPStorageFactory = require('./GCP/GCPStorageFactory');
const GCPStorage = require('@google-cloud/storage');
const GCPStorageProvider = require('./GCP/GCPStorageProvider');
const AWSStorageProvider = require('./AWS/AWSStorageProvider');

/**
 * Wrapper class for cloud-specific storage providers. 
 * Classes can depend on this abstraction, allowing the underlying cloud storage provider 
 * to be switched by modifying the configuration.
 */
class StorageProvider {
  /**
   * Constructor
   * @param {Object} config - Configuration object containing "cloudProvider","buckets.public_assets", "cloudCredentials".
   */
  constructor(config) {
    config = typeof(config)=="object" ? config : JSON.parse(config);
    if (!config || !config.cloudProvider || !config?.buckets?.public_assets) {
      const message = `Invalid configuration. Ensure "cloudProvider" and "buckets.public_assets" are defined.`;
      console.error(message);
      throw new Error(message);
    }

    const { cloudProvider, buckets } = config;

    // Initialize the provider based on the cloudProvider
    switch (cloudProvider.toLowerCase()) {
      case 'gcp':
        this.provider = new GCPStorageProvider(
          GCPStorageFactory.create(GCPStorage, config),
          buckets.public_assets
        );
        console.log(`GCP storage provider initialized with bucket: ${buckets.public_assets}`);
        break;

      case 'aws':
        this.provider = new AWSStorageProvider(config, buckets.public_assets);
        console.log(`AWS storage provider initialized with bucket: ${buckets.public_assets}`);
        break;

      default:
        const unsupportedMessage = `Unsupported provider type: ${cloudProvider}`;
        console.error(unsupportedMessage);
        throw new Error(unsupportedMessage);
    }
  }

  /**
   * Uploads a file to the specified file path with the provided contents.
   * @param {Buffer|string} contents - Contents of the file to upload.
   * @param {string} filePath - The file path (including file name) where the content will be uploaded.
   * @returns {Promise<Object>} - Result of the upload operation.
   */
  async upload(contents, filePath) {
    if (!contents || !filePath) {
      throw new Error('Both contents and filePath are required for the upload.');
    }
    try {
      return await this.provider.upload(contents, filePath);
    } catch (error) {
      console.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes the file at the specified file path.
   * @param {string} filePath - File path (including file name) to delete.
   * @returns {Promise<void>} - Resolves if deletion is successful.
   */
  async deleteFile(filePath) {
    if (!filePath) {
      throw new Error('File path is required for deleteFile.');
    }
    try {
      await this.provider.deleteFile(filePath);
      console.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      console.error(`File deletion failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = StorageProvider;
