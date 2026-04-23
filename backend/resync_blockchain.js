const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const crypto = require('crypto');
const KeyService = require('./KeyService');

const getGradeDataString = (g) => {
    const f = (v) => (v != null && v !== '') ? parseFloat(v).toFixed(1) : '';
    return `${g.student_id}-${g.subject}-${f(g.tx1)}-${f(g.tx2)}-${f(g.tx3)}-${f(g.tx4)}-${f(g.tx5)}-${f(g.gk)}-${f(g.ck)}-${f(g.score)}`;
};

async function resync() {
    KeyService.initKeys();
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log("Re-syncing Blockchain hashes and generating RSA signatures...");

    try {
        // Clear all logs to match the current state (This is a mock blockchain)
        await db.run("DELETE FROM blockchain_logs");

        // Schema update fallback
        try { await db.exec("ALTER TABLE grades ADD COLUMN signature TEXT"); } catch (e) {}
        try { await db.exec("ALTER TABLE certificates ADD COLUMN signature TEXT"); } catch (e) {}

        // Resync Grades
        const grades = await db.all('SELECT * FROM grades');
        for (let g of grades) {
            const data = getGradeDataString(g);
            const newHash = crypto.createHash('sha256').update(data).digest('hex');
            const signature = KeyService.signData(data);
            await db.run('UPDATE grades SET hash = ?, signature = ? WHERE id = ?', [newHash, signature, g.id]);
            await db.run('INSERT OR IGNORE INTO blockchain_logs (data_hash) VALUES (?)', [newHash]);
        }
        console.log(`✅ Resynced ${grades.length} grades.`);

        // Resync Certificates
        const certs = await db.all('SELECT * FROM certificates');
        for (let c of certs) {
            const data = `${c.student_id}-${c.cert_name}-${c.issue_date}`;
            const newHash = crypto.createHash('sha256').update(data).digest('hex');
            const signature = KeyService.signData(data);
            await db.run('UPDATE certificates SET hash = ?, signature = ? WHERE id = ?', [newHash, signature, c.id]);
            await db.run('INSERT OR IGNORE INTO blockchain_logs (data_hash) VALUES (?)', [newHash]);
        }
        console.log(`✅ Resynced ${certs.length} certificates.`);

        console.log("🚀 Security Academy RSA + Blockchain synchronization complete.");
    } catch (err) {
        console.error("❌ Resync failed:", err.message);
    } finally {
        await db.close();
    }
}

resync();
