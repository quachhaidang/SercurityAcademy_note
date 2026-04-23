const crypto = require('crypto-js');

class HashService {
    static generateHash(dataString) {
        return crypto.SHA256(dataString).toString(crypto.enc.Hex);
    }
}

module.exports = HashService;
