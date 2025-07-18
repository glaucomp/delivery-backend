async function insertDelivery(conn, {
  jobId, address, latitude, longitude, run,
  invoiceNumber, customerName, deliveryTime, notes, controlCodes, carriage, status = 'active', sequence
}) {
  const [result] = await conn.query(
    `INSERT INTO deliveries
      (job_id, address, latitude, longitude, run, invoiceNumber, customerName, deliveryTime, notes, controlCodes, carriage, status, sequence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId, address, latitude, longitude, run,
      invoiceNumber, customerName, deliveryTime, notes, controlCodes, carriage, status, sequence
    ]
  );
  return result.insertId;
}

async function listDeliveries(conn) {
  const [rows] = await conn.query('SELECT * FROM deliveries ORDER BY createdAt DESC');
  return rows;
}

async function listDeliveriesByJob(conn, jobId) {
  const [rows] = await conn.query(
    'SELECT * FROM deliveries WHERE job_id = ? ORDER BY createdAt DESC',
    [jobId]
  );
  return rows;
}

module.exports = {
  insertDelivery,
  listDeliveries,
  listDeliveriesByJob,
};