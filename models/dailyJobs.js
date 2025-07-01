export async function listDailyJobs(conn) {
  const [rows] = await conn.query(
    'SELECT * FROM daily_jobs ORDER BY date DESC'
  );
  return rows;
}

export async function insertDailyJob(conn, { name, date }) {
  const [result] = await conn.query(
    'INSERT INTO daily_jobs (name, date) VALUES (?, ?)',
    [name, date]
  );
  return result.insertId;
}