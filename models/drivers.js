// models/drivers.js

// ========================
// MOTORISTA (dados fixos)
// ========================
async function insertDriver(conn, {
  name, phone, email, status = 'active', vehicle = null
}) {
  const [result] = await conn.query(
    `INSERT INTO drivers
      (name, phone, email, status, vehicle)
     VALUES (?, ?, ?, ?, ?)`,
    [name, phone, email, status, vehicle]
  );
  return result.insertId;
}

async function listDrivers(conn) {
  const [rows] = await conn.query(
    'SELECT * FROM drivers ORDER BY createdAt DESC'
  );
  return rows;
}

async function listActiveDrivers(conn) {
  const [rows] = await conn.query(
    'SELECT * FROM drivers WHERE status = "active" ORDER BY name ASC'
  );
  return rows;
}

async function getDriver(conn, driverId) {
  const [rows] = await conn.query(
    'SELECT * FROM drivers WHERE id = ? LIMIT 1',
    [driverId]
  );
  return rows[0] || null;
}

// ==================================
// LOCALIZAÇÕES (histórico de fixes)
// ==================================
async function insertDriverLocation(conn, {
  driverId, latitude, longitude, heading = null, recordedAt = null
}) {
  const [result] = await conn.query(
    `INSERT INTO driver_locations
      (driver_id, latitude, longitude, heading, recorded_at)
     VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
    [driverId, latitude, longitude, heading, recordedAt]
  );
  return result.insertId;
}

async function getDriverLatestLocation(conn, driverId) {
  const [rows] = await conn.query(
    `SELECT driver_id, latitude, longitude, heading, recorded_at
       FROM driver_locations
      WHERE driver_id = ?
      ORDER BY recorded_at DESC
      LIMIT 1`,
    [driverId]
  );
  return rows[0] || null;
}

async function listDriverLocations(conn, driverId, { limit = 100, before = null } = {}) {
  const params = [driverId];
  let sql =
    `SELECT driver_id, latitude, longitude, heading, recorded_at
       FROM driver_locations
      WHERE driver_id = ?`;

  if (before) {
    sql += ' AND recorded_at < ?';
    params.push(before);
  }

  sql += ' ORDER BY recorded_at DESC LIMIT ?';
  params.push(Number(limit));

  const [rows] = await conn.query(sql, params);
  return rows;
}

// ===========================================
// LISTAGEM com ÚLTIMA POSIÇÃO por motorista
// ===========================================
async function listDriversWithLatestLocation(conn) {
  // Subconsulta correlacionada para pegar último fix de cada driver
  const [rows] = await conn.query(
    `SELECT d.*,
            dl.latitude AS last_latitude,
            dl.longitude AS last_longitude,
            dl.heading  AS last_heading,
            dl.recorded_at AS last_fix_at
       FROM drivers d
  LEFT JOIN (
          SELECT t1.driver_id, t1.latitude, t1.longitude, t1.heading, t1.recorded_at
            FROM driver_locations t1
            JOIN (
                  SELECT driver_id, MAX(recorded_at) AS max_ts
                    FROM driver_locations
                GROUP BY driver_id
                 ) t2
              ON t1.driver_id = t2.driver_id AND t1.recorded_at = t2.max_ts
     ) dl
         ON dl.driver_id = d.id
   ORDER BY d.createdAt DESC`
  );
  return rows;
}

// ======================================================
// COMPATIBILIDADE com código legado (assinaturas antigas)
// ======================================================
async function updateDriverLocation(conn, driverId, latitude, longitude, heading = null) {
  // Agora gravamos como histórico em driver_locations:
  await insertDriverLocation(conn, { driverId, latitude, longitude, heading });
  return true;
}

async function getDriverLocation(conn, driverId) {
  // Agora buscamos o último fix em driver_locations:
  const latest = await getDriverLatestLocation(conn, driverId);
  if (!latest) return null;
  // Mantém um shape parecido com o legado:
  return {
    id: driverId,
    name: undefined,             // não retorna nome aqui
    latitude: latest.latitude,
    longitude: latest.longitude,
    heading: latest.heading,
    updatedAt: latest.recorded_at
  };
}

module.exports = {
  // drivers
  insertDriver,
  listDrivers,
  listActiveDrivers,
  getDriver,

  // locations (novo)
  insertDriverLocation,
  getDriverLatestLocation,
  listDriverLocations,
  listDriversWithLatestLocation,

  // compat (mantém chamadas antigas funcionando)
  updateDriverLocation,
  getDriverLocation,
};