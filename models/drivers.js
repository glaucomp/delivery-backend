// models/drivers.js

async function insertDriver(conn, {
  name, phone, email, status = 'active',
  latitude = null, longitude = null, heading = null, vehicle = null
}) {
  const [result] = await conn.query(
    `INSERT INTO drivers
      (name, phone, email, status, latitude, longitude, heading, vehicle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, email, status, latitude, longitude, heading, vehicle]
  );
  return result.insertId;
}

async function updateDriverLocation(conn, driverId, latitude, longitude, heading = null) {
  await conn.query(
    `UPDATE drivers
        SET latitude = ?, longitude = ?, heading = ?, updatedAt = NOW()
      WHERE id = ?`,
    [latitude, longitude, heading, driverId]
  );
  return true;
}

async function listDrivers(conn) {
  const [rows] = await conn.query('SELECT * FROM drivers ORDER BY createdAt DESC');
  return rows;
}

async function getDriver(conn, driverId) {
  const [rows] = await conn.query('SELECT * FROM drivers WHERE id = ? LIMIT 1', [driverId]);
  return rows[0] || null;
}

async function listActiveDrivers(conn) {
  const [rows] = await conn.query('SELECT * FROM drivers WHERE status = "active" ORDER BY name ASC');
  return rows;
}

async function getDriverLocation(conn, driverId) {
  const [rows] = await conn.query(
    'SELECT id, name, latitude, longitude, heading, updatedAt FROM drivers WHERE id = ? LIMIT 1',
    [driverId]
  );
  return rows[0] || null;
}

module.exports = {
  insertDriver,
  updateDriverLocation,
  listDrivers,
  getDriver,
  listActiveDrivers,
  getDriverLocation,
};