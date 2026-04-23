const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

(async () => {
    try {
        const db = await open({
            filename: path.join(__dirname, 'database.sqlite'),
            driver: sqlite3.Database
        });
        await db.run("DELETE FROM classes WHERE class_name IN ('10C1', '11A1', '12B2')");
        await db.run("DELETE FROM subjects WHERE subject_name IN ('Toán học', 'Ngữ văn', 'Tiếng Anh')");
        console.log('Defaults removed');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
