require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');

const deliveryModel = require('./models/deliveries');
const photoModel = require('./models/photos');
const app = express();
const { getKeyFromS3Url, getSignedUrl } = require('./utils/s3');
const dailyJobModel = require('./models/dailyJobs');

console.log("Running server.js!");

app.use(cors());

app.use(express.json()); // Middleware global

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const S3_BUCKET = process.env.S3_BUCKET_NAME;

const upload = multer({ storage: multer.memoryStorage() });

// Rota para criar entrega (com fotos OU só dados)
app.post('/api/deliveries', upload.array('photos', 5), async (req, res) => {
  // Suporte a JSON e multipart (fotos)
  const data = req.body;
  const hasPhotos = req.files && req.files.length > 0;
  const {
    jobId, address, latitude, longitude, run, invoiceNumber, customerName,
    deliveryTime, notes, controlCodes, carriage, status = 'active', sequence
  } = data;

  //TODO
  //if (!address || !latitude || !longitude)
  //return res.status(400).json({ message: "Dados incompletos" });

  const conn = await db.getConnection();
  try {
    // 1. Salva entrega
    const deliveryId = await deliveryModel.insertDelivery(conn, {
      jobId, address, latitude, longitude, run, invoiceNumber, customerName,
      deliveryTime, notes, controlCodes, carriage, status, sequence
    });

    // 2. Salva fotos se houver
    if (hasPhotos) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const photoLat = req.body[`photoLat_${i}`] || null;
        const photoLng = req.body[`photoLng_${i}`] || null;
        const photoCaption = req.body[`photoCaption_${i}`] || null;
        const fileKey = `${uuidv4()}_${file.originalname}`;
        const params = {
          Bucket: S3_BUCKET,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype
        };
        const uploadResult = await s3.upload(params).promise();

        await photoModel.insertPhoto(conn, {
          deliveryId,
          url: uploadResult.Location,
          latitude: photoLat,
          longitude: photoLng,
          caption: photoCaption
        });
      }
    }

    res.status(201).json({ message: "Entrega criada", deliveryId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// Rota para listar entregas + fotos
app.get('/api/deliveries', async (req, res) => {
  const jobId = req.query.job;
  const conn = await db.getConnection();
  try {
    let deliveries = [];
    if (jobId) {
      deliveries = await deliveryModel.listDeliveriesByJob(conn, jobId);
    } else {
      deliveries = await deliveryModel.listDeliveries(conn);
    }
    for (let delivery of deliveries) {
      const photos = await photoModel.listPhotosByDelivery(conn, delivery.id);
      delivery.photos = photos.map(photo => ({
        ...photo,
        signedUrl: getSignedUrl(getKeyFromS3Url(photo.url))
      }));
    }
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// Listar daily jobs
app.get('/api/daily-jobs', async (req, res) => {
  console.log("Listando daily jobs");
  const conn = await db.getConnection();
  try {
    const jobs = await dailyJobModel.listDailyJobs(conn);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// Atualizar entrega (PUT: update tudo, incluindo run)
app.put('/api/deliveries/:id', async (req, res) => {
  const {
    jobId, address, latitude, longitude, invoiceNumber, customerName, deliveryTime, notes, controlCodes,
    carriage, status, sequence, run
  } = req.body;
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.query(
      `UPDATE deliveries SET
        job_id = ?,
        address = ?,
        latitude = ?,
        longitude = ?,
        invoiceNumber = ?,
        customerName = ?,
        deliveryTime = ?,
        notes = ?,
        controlCodes = ?,
        carriage = ?,
        status = ?,
        sequence = ?,
        run = ?
      WHERE id = ?`,
      [jobId, address, latitude, longitude, invoiceNumber, customerName, deliveryTime, notes, controlCodes, carriage, status, sequence, run, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/deliveries/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.query('DELETE FROM deliveries WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// Criar daily job
app.post('/api/daily-jobs', async (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json({ message: "Nome e data obrigatórios." });

  const conn = await db.getConnection();
  try {
    const id = await dailyJobModel.insertDailyJob(conn, { name, date });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

app.get('/api/analytics/deliveries-count', async (req, res) => {
  const { from, to } = req.query;
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT DATE(createdAt) as date, COUNT(*) as count
       FROM deliveries
       WHERE createdAt BETWEEN ? AND ?
       GROUP BY DATE(createdAt)
       ORDER BY date ASC`,
      [from, to]
    );
    res.json(rows); // [{date: '2025-06-01', count: 15}, ...]
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

//React Native: List deliveries for a specific driver on a specific date
app.get('/api/driver-deliveries', async (req, res) => {
  const { date } = req.query;
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT d.*
       FROM deliveries d
       JOIN daily_jobs dj ON d.job_id = dj.id
       WHERE dj.date = ? AND d.status = "active"
       ORDER BY d.createdAt ASC`,
      [date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

app.post('/api/delivery-photo', upload.single('photo'), async (req, res) => {
  const { deliveryId, caption, latitude, longitude } = req.body;

  console.log("📦 [Payload Recebido]:", { deliveryId, caption, latitude, longitude });

  if (!req.file || !deliveryId) {
    console.error("❌ [Erro]: Campos obrigatórios faltando", { fileRecebido: !!req.file, deliveryId });
    return res.status(400).json({ message: "Missing fields (deliveryId ou arquivo da foto ausente)" });
  }

  const conn = await db.getConnection();
  try {
    let lat = parseFloat(latitude);
    let lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn("⚠️ [Aviso]: Latitude/Longitude inválidas. Tentando recuperar do banco para deliveryId:", deliveryId);
      const [deliveryRow] = await conn.query(
        'SELECT latitude, longitude FROM deliveries WHERE id = ?', [deliveryId]
      );

      if (deliveryRow && deliveryRow[0]) {
        lat = deliveryRow[0].latitude;
        lng = deliveryRow[0].longitude;
        console.log("✅ [Banco]: Recuperado do banco lat/lng:", { lat, lng });
      } else {
        throw new Error("Delivery não encontrado para obter latitude/longitude!");
      }
    }

    console.log("🚀 [AWS S3]: Enviando foto para S3...");
    const fileKey = `${uuidv4()}_${req.file.originalname}`;
    const params = {
      Bucket: S3_BUCKET,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const uploadResult = await s3.upload(params).promise();
    console.log("✅ [AWS S3]: Upload concluído", uploadResult.Location);

    console.log("💾 [Banco]: Inserindo registro da foto no banco...");
    await photoModel.insertPhoto(conn, {
      deliveryId,
      url: uploadResult.Location,
      lat,
      lng,
      caption,
    });

    console.log("✅ [Banco]: Foto salva com sucesso no banco!");
    res.status(201).json({ message: "Foto salva!", url: uploadResult.Location });

  } catch (err) {
    console.error("❌ [Erro ao salvar foto]:", err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
    console.log("🔒 [Banco]: Conexão com o banco liberada.");
  }
});

app.post('/api/driver-location', async (req, res) => {
  const { driverId, latitude, longitude, timestamp } = req.body;
  if (!driverId || !latitude || !longitude)
    return res.status(400).json({ message: "Faltam dados obrigatórios!" });

  const conn = await db.getConnection();
  try {
    await conn.query(
      'INSERT INTO driver_locations (driver_id, latitude, longitude, timestamp) VALUES (?, ?, ?, ?)',
      [driverId, latitude, longitude, timestamp || new Date()]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

app.get('/api/deliveries/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM deliveries WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Entrega não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

app.put('/api/deliveries/:id/mark-sent', async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.query('UPDATE deliveries SET status = "inactive" WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

app.listen(3001, () => console.log('Backend rodando na porta 3001'));