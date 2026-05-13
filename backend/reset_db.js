/**
 * reset_db.js — Xóa toàn bộ dữ liệu, giữ nguyên schema + tài khoản admin
 * Chạy: node reset_db.js
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function resetDb() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('🔄 Đang reset database...\n');

    // Xóa toàn bộ dữ liệu từng bảng (giữ schema)
    const tables = [
        { name: 'revocations',    label: '🚫 Revocations (thu hồi)' },
        { name: 'blockchain_logs',label: '⛓  Blockchain logs' },
        { name: 'certificates',   label: '📜 Certificates (chứng chỉ)' },
        { name: 'grades',         label: '📊 Grades (điểm số)' },
        { name: 'students',       label: '👤 Students (sinh viên)' },
        { name: 'classes',        label: '🏫 Classes (lớp học)' },
        { name: 'subjects',       label: '📚 Subjects (môn học)' },
    ];

    for (const t of tables) {
        const before = await db.get(`SELECT COUNT(*) as cnt FROM ${t.name}`);
        await db.run(`DELETE FROM ${t.name}`);
        await db.run(`DELETE FROM sqlite_sequence WHERE name = '${t.name}'`);
        console.log(`  ✓ ${t.label}: xóa ${before.cnt} bản ghi`);
    }

    // Giữ nguyên tài khoản admin & student
    console.log('\n✅ Giữ lại tài khoản:');
    const users = await db.all("SELECT username, role FROM users");
    users.forEach(u => console.log(`  👤 ${u.username} (${u.role})`));

    await db.close();
    console.log('\n🎉 Reset hoàn tất! Database sạch, sẵn sàng demo lại.');
}

resetDb().catch(err => {
    console.error('❌ Lỗi reset:', err.message);
    process.exit(1);
});
