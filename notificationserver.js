const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
//this is for scheduling periodic tasks, if needed in future
const cron = require('node-cron');


const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'foodtrackingdatabase', // your DB
  password: 'EPE321Password!',
  port: 5432,
});

// Endpoint to get food expiry notifications
//WHERE expiry_date <= CURRENT_DATE + INTERVAL '2 days'
app.get('/notifications', async (req, res) => {
  try {
    const result = await pool.query(`
  SELECT 
    id, 
    name, 
    image_url,
    to_char(expiry_date, 'YYYY-MM-DD') AS expiry_date_str
  FROM food_items
  WHERE expiry_date <= CURRENT_DATE + INTERVAL '2 days'
  ORDER BY expiry_date ASC
`);

    // Convert rows to notification messages
    const notifications = result.rows.map(item => ({
      id: item.id,
      name: item.name,
      image_url: item.image_url,
      message: `${item.name} expires on ${item.expiry_date_str}`

    }));

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Schedule a daily task at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  try {
    const result = await pool.query(`
      SELECT id, name, expiry_date, image_url,
      to_char(expiry_date, 'YYYY-MM-DD') AS expiry_date_str
      FROM food_items
      WHERE expiry_date = CURRENT_DATE + INTERVAL '2 days'
    `);

    if (result.rows.length > 0) {
      console.log('Expiring items in 2 days:');
      result.rows.forEach(item => {
        console.log(`${item.name} expires on ${item.expiry_date_str}`);
        // You could also push notifications to clients here or send emails
      });
    } else {
      console.log('No items expiring in 2 days.');
    }

  } catch (err) {
    console.error('Error running daily notification check:', err);
  }
});


app.listen(5000, () => console.log('Server running on port 5000'));
