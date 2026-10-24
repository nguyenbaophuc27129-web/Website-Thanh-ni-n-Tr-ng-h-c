const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const sampleUnits = [
    { id: 13101, parent_id: 131, code: 'TD-VINH', name: 'Đoàn TNCS Hồ Chí Minh Thành phố Vinh', short_name: 'Thành đoàn Vinh', org_level: 3 },
    { id: 13102, parent_id: 131, code: 'HD-DC', name: 'Đoàn TNCS Hồ Chí Minh Huyện Diễn Châu', short_name: 'Huyện đoàn Diễn Châu', org_level: 3 },
    { id: 13103, parent_id: 131, code: 'DT-DHV', name: 'Đoàn trường Đại học Vinh', short_name: 'Đoàn ĐH Vinh', org_level: 3 },
    { id: 131101, parent_id: 13101, code: 'THPT-PBC', name: 'Đoàn trường THPT Chuyên Phan Bội Châu', short_name: 'THPT Phan Bội Châu', org_level: 4 },
    { id: 131102, parent_id: 13101, code: 'THPT-HTK', name: 'Đoàn trường THPT Huỳnh Thúc Kháng', short_name: 'THPT Huỳnh Thúc Kháng', org_level: 4 },
    { id: 131103, parent_id: 13102, code: 'THPT-DC1', name: 'Đoàn trường THPT Diễn Châu 1', short_name: 'THPT Diễn Châu 1', org_level: 4 },
  ];

  for (const u of sampleUnits) {
    await pool.query(
      `INSERT INTO org_units (id, parent_id, code, name, short_name, org_level, is_active)
       OVERRIDING SYSTEM VALUE
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO UPDATE SET
         parent_id = EXCLUDED.parent_id,
         name = EXCLUDED.name,
         short_name = EXCLUDED.short_name,
         org_level = EXCLUDED.org_level,
         is_active = true`,
      [u.id, u.parent_id, u.code, u.name, u.short_name, u.org_level]
    );
  }

  // Also assign leaf tasks from BTS-TINH-2027 to these units
  const leafTasks = await pool.query(
    `SELECT id, due_date FROM tasks WHERE criteria_set_id = 3 AND task_kind = 'CRITERION'`
  );
  console.log(`Found ${leafTasks.rows.length} leaf tasks`);

  let count = 0;
  for (const u of sampleUnits) {
    for (const t of leafTasks.rows) {
      const ins = await pool.query(
        `INSERT INTO task_assignments (task_id, org_unit_id, assigned_by_org_unit_id, due_date, progress_status, confirm_status, completion_rate)
         VALUES ($1, $2, $3, $4, 'NOT_STARTED', 'PENDING', 0)
         ON CONFLICT DO NOTHING RETURNING id`,
        [t.id, u.id, u.parent_id, t.due_date || '2027-12-31']
      );
      if (ins.rows.length > 0) count++;
    }
  }
  console.log(`Seeded subordinate units and ${count} subordinate task assignments.`);
  pool.end();
}

run().catch(e => {
  console.error(e);
  pool.end();
});
