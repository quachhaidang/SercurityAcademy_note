const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY_PATH = path.join(__dirname, 'private.pem');
const PUBLIC_KEY_PATH = path.join(__dirname, 'public.pem');

class KeyService {
    static initKeys() {
        if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
            console.log("Generating new RSA Key Pair for Security Academy...");
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });
            fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
            fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
            console.log("Keys generated securely.");
        }
    }

    static getPrivateKey() {
        return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    }

    static getPublicKey() {
        return fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    }

    static signData(dataString) {
        const sign = crypto.createSign('SHA256');
        sign.update(dataString);
        sign.end();
        return sign.sign(this.getPrivateKey(), 'base64');
    }

    static verifySignature(dataString, signatureBuffer) {
        if (!signatureBuffer) return false;
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(dataString);
            verify.end();
            return verify.verify(this.getPublicKey(), signatureBuffer, 'base64');
        } catch (e) {
            return false;
        }
    }
}

module.exports = KeyService;
