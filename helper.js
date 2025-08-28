const { v4: uuidv4 } = require('uuid');

const createRequestID = (requestId) => {
  const requestID = typeof requestId === 'object' && requestId !== null ? requestId : {};
  requestID.ts = Math.round(new Date().getTime() / 1000);
  requestID.uuid = requestId && requestId.uuid ? requestId.uuid : requestId || uuidv4();
  requestID.appid = requestId && requestId.appid ? requestId.appid : "com.1kosmos.helper.request";
  return requestID;
};

module.exports = {
  createRequestID,
};
