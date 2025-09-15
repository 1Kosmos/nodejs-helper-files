"use strict";
const WTM = require('./WTM');

const getEnvironment = async () => {
    const url = process.env.CAAS_API;
    const response = await WTM.executeRequest({
        method: 'get',
        url,
        keepAlive: true,
    });
    const ret = response && response.json ? response.json : null;
    if (!ret) {
        ret = {};
    }
    if (!ret.allowed_time_span === undefined) {
        ret.allowed_time_span = 60;
    }
    return ret;
};

module.exports = {
    getEnvironment
}
