const AWS = require('aws-sdk');

class AWSStorageProvider {
  /**
   * AWSStorageProvider constructor
   * @param {string} bucketName - The bucket name we are storing data under
   * @param {object | string } config - The cloudStorage config
   */
  constructor(config, bucketName) {
    if (!bucketName) {
      throw new Error('Bucket name is required for AWSStorageProvider.');
    }
    this.bucketName = bucketName;
    if(config.cloudCredentials){
      AWS.config.update(config.cloudCredentials);
    }
    this.s3 = new AWS.S3();
    console.log(`AWSStorageProvider initialized with bucket: ${bucketName}`);
  }

  /**
   * Upload contents to a specified file path
   * @param {Buffer|string} contents - The contents to upload
   * @param {string} filePath - The file path (including file name) where the content will be uploaded
   * @returns {Promise<Object>} - The result object from S3 upload
   */
  async upload(contents, filePath) {
    if (!contents || !filePath) {
      throw new Error('Both contents and filePath are required for upload.');
    }
    const params = {
      Bucket: this.bucketName,
      Key: filePath,
      Body: contents.buffer,
      ContentType: contents.mimetype
    };
    try {
      const result = await this.s3.upload(params).promise();
      console.log(`Upload successful: ${result.Location}`);
      return result.Location;
    } catch (error) {
      throw new Error(`Failed to upload to S3: ${error.message}`);
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
    const params = {
      Bucket: this.bucketName,
      Key: filePath,
    };
    try {
      await this.s3.deleteObject(params).promise();
    } catch (error) {
      if (error.code !== 'NoSuchKey') {
        throw new Error(`Failed to delete file from S3: ${error.message}`);
      }
      // Handle "NoSuchKey" error gracefully
      console.warn(`File not found (no deletion needed): ${filePath}`);
    }
  }
}

module.exports = AWSStorageProvider;
