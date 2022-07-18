const http = require("http");
const https = require("https");

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const keepAliveAgent = (_parsedURL) =>
  _parsedURL.protocol == "http:" ? httpAgent : httpsAgent;

module.exports = keepAliveAgent;
