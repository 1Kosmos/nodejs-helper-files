"use strict";
const WTM = require('./WTM');

const getEnvironment = async () => {
    try {
        const caas_url = process.env.CAAS_API || 'http://caas:8888'
        const url = `${caas_url}/environment`;
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
    } catch (error) {
        return {};
    }
};

module.exports = {
    getEnvironment
}
