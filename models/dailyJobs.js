async function listDailyJobs(conn) {
  const [rows] = await conn.query(
    'SELECT * FROM daily_jobs ORDER BY date DESC'
  );
  return rows;
}

async function insertDailyJob(conn, { name, date }) {
  const [result] = await conn.query(
    'INSERT INTO daily_jobs (name, date) VALUES (?, ?)',
    [name, date]
  );
  return result.insertId;
}

async function upsertDailyJobByDate(conn, { name, date }) {
  try {
    const id = await insertDailyJob(conn, { name, date });
    return { id, name, date, created: true };
  } catch (e) {
    // ER_DUP_ENTRY
    if (e && e.code === 'ER_DUP_ENTRY') {
      const [rows] = await conn.query(
        'SELECT id, name, date FROM daily_jobs WHERE date = ? LIMIT 1',
        [date]
      );
      if (rows[0]) {
        return { id: rows[0].id, name: rows[0].name, date: rows[0].date, created: false };
      }
    }
    throw e;
  }
}

module.exports = {
  listDailyJobs,
  insertDailyJob,
  upsertDailyJobByDate,
};