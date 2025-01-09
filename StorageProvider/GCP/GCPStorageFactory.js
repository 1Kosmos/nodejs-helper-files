class GCPStorageFactory {
  static create({ Storage }, config) {
    let client;

    try {
      if (config.cloudCredentials) {
        client = new Storage({
          credentials: require('../../google-cloud-key.json'),
        });
      } else {
        client = new Storage();
      }
    } catch (error) {
      client = new Storage();
    }

    return client;
  }
}

module.exports = GCPStorageFactory;
