// models/photos.js
exports.insertPhoto = async (conn, { deliveryId, url, latitude, longitude, caption }) => {
  const lat =
    latitude !== null &&
      latitude !== undefined &&
      latitude !== '' &&
      latitude !== 'null'
      ? Number(latitude)
      : null;

  const lng =
    longitude !== null &&
      longitude !== undefined &&
      longitude !== '' &&
      longitude !== 'null'
      ? Number(longitude)
      : null;

  await conn.query(
    'INSERT INTO photos (delivery_id, url, latitude, longitude, caption) VALUES (?, ?, ?, ?, ?)',
    [deliveryId, url, lat, lng, caption]
  );
};

exports.listPhotosByDelivery = async (conn, deliveryId) => {

  const [rows] = await conn.query(
    'SELECT url, latitude, longitude,caption FROM photos WHERE delivery_id = ?',
    [deliveryId]
  );
  return rows;
};