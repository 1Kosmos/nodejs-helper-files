"use strict";
const WTM = require('./WTM');

const getEnvironment = async () => {
    if(!process.env.CAAS_API) return {};
    const url = `${process.env.CAAS_API}/environment`;
    const response = await WTM.executeRequest({
        method: 'get',
        url,
        keepAlive: true,
    });
    let ret = response && response.json ? response.json : null;
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
