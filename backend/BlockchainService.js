const HashService = require('./HashService');

class BlockchainService {
    constructor(db) {
        this.db = db;
    }

    async saveHash(dataString) {
        const hash = HashService.generateHash(dataString);
        await this.db.run('INSERT OR IGNORE INTO blockchain_logs (data_hash) VALUES (?)', [hash]);
        return hash;
    }

    async verifyHash(dataString) {
        const hash = HashService.generateHash(dataString);
        const record = await this.db.get('SELECT * FROM blockchain_logs WHERE data_hash = ?', [hash]);
        return record ? 'Valid' : 'Tampered';
    }

    async revokeHash(dataHash, reason, revokedBy) {
        const existing = await this.db.get('SELECT * FROM revocations WHERE data_hash = ?', [dataHash]);
        if (existing) return { alreadyRevoked: true };
        await this.db.run(
            'INSERT INTO revocations (data_hash, reason, revoked_by) VALUES (?, ?, ?)',
            [dataHash, reason, revokedBy]
        );
        return { success: true };
    }

    async isRevoked(dataHash) {
        const record = await this.db.get('SELECT * FROM revocations WHERE data_hash = ?', [dataHash]);
        return record || null;
    }

    async getLatestLogs(limit = 30) {
        const logs = await this.db.all(
            `SELECT 
                bl.id, 
                bl.data_hash, 
                bl.timestamp,
                CASE WHEN r.data_hash IS NOT NULL THEN 'Revoked' ELSE 'Active' END as status,
                r.reason as revoke_reason, 
                r.revoked_by,
                COALESCE(g.subject, c.cert_name) as record_name,
                COALESCE(g.student_id, c.student_id) as student_id,
                s.name as student_name,
                CASE 
                    WHEN g.hash IS NOT NULL THEN 'Grade' 
                    WHEN c.hash IS NOT NULL THEN 'Certificate' 
                    ELSE 'System' 
                END as record_type
            FROM blockchain_logs bl
            LEFT JOIN revocations r ON bl.data_hash = r.data_hash
            LEFT JOIN grades g ON bl.data_hash = g.hash
            LEFT JOIN certificates c ON bl.data_hash = c.hash
            LEFT JOIN students s ON COALESCE(g.student_id, c.student_id) = s.student_id
            ORDER BY bl.timestamp DESC LIMIT ?`,
            [limit]
        );
        return logs;
    }

    async getStats() {
        const total = await this.db.get('SELECT COUNT(*) as cnt FROM blockchain_logs');
        const revoked = await this.db.get('SELECT COUNT(*) as cnt FROM revocations');
        return {
            totalHashes: total.cnt,
            revokedCount: revoked.cnt,
            activeCount: total.cnt - revoked.cnt
        };
    }
}

module.exports = BlockchainService;
