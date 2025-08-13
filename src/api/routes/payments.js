const express = require('express');
const router = express.Router();
const { pool } = require('../../../config/database');
const { authenticateToken } = require('../middleware/auth');

// OnvoPay configuration
const onvoSecretKey = process.env.ONVO_SECRET_KEY || 'onvo_test_secret_key_OXQTjlf2rmmkNhT5aPRkspKQd7SzL5JqqtRM02v9IHCckTa5AVn3sB1DtKyKsLSGkFtVJ8QwWzOk11pelLTsIw';
const onvoPublishableKey = process.env.ONVO_PUBLISHABLE_KEY || 'onvo_test_publishable_key_kzOkpVEfSmImyAv4xr-vHx-xRpA5flmHqVygpk3V8CQ6QAFJKoOMc5aCOOFCwGtdtVsmS04V7gqp9zOYwyMIGQ';

// Get Course Details
router.get('/course-details', authenticateToken, async (req, res) => {
  try {
    const { cursoId } = req.query;
    if (!cursoId || isNaN(cursoId)) {
      return res.status(400).json({ error: 'ID de curso inválido' });
    }

    const courseResult = await pool.query(`
      SELECT lx.shortname, lx_price.amount_monthly AS pricemonthly, lx_price.amount_6months AS price6months, lx_price.monthly_price_id AS monthly_price_id
      FROM lx
      LEFT JOIN lx_price ON lx.id_lx_price = lx_price.id
      WHERE lx.id = $1 AND lx.status = 'active'
    `, [cursoId]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    const { shortname, pricemonthly, price6months, monthly_price_id } = courseResult.rows[0];
    console.log('Course details:', { cursoId, shortname, pricemonthly, price6months });

    if (pricemonthly == null || price6months == null) {
      return res.status(400).json({ error: 'Precios del curso no definidos' });
    }

    const formattedPriceMonthly = Number(pricemonthly).toFixed(2);
    const formattedPrice6Months = Number(price6months).toFixed(2);
    if (isNaN(formattedPriceMonthly) || isNaN(formattedPrice6Months)) {
      return res.status(500).json({ error: 'Los precios del curso no son válidos' });
    }

    res.json({
      courseName: shortname,
      priceMonthly: formattedPriceMonthly,
      price6Months: formattedPrice6Months,
      monthlyPriceId: monthly_price_id // For subscriptions
    });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener detalles del curso', details: error.message });
  }
});

// Create Onvo Customer
router.post('/create-onvo-customer', authenticateToken, async (req, res) => {
  try {
    const { studentId, email, name } = req.body;
    if (!studentId || !email || !name) {
      return res.status(400).json({ error: 'Faltan datos del estudiante' });
    }

    const customer = await fetch('https://api.onvopay.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${onvoSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        name,
        description: `Estudiante ID: ${studentId}`
      })
    });

    const customerData = await customer.json();
    if (customerData.error) {
      return res.status(400).json({ error: customerData.error.message });
    }

    // Store customer ID in database
    await pool.query(`
      UPDATE student
      SET onvo_customer_id = $1
      WHERE id_student = $2
    `, [customerData.id, studentId]);

    res.json({ customerId: customerData.id });
  } catch (error) {
    console.error('Error creating Onvo customer:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Create Onvo Subscription
router.post('/create-onvo-subscription', authenticateToken, async (req, res) => {
  try {
    const { cursoId, studentId, priceId } = req.body;
    if (!cursoId || !studentId || !priceId) {
      return res.status(400).json({ error: 'Faltan datos requeridos: cursoId, studentId, o priceId' });
    }

    // Validate priceId is a string
    if (typeof priceId !== 'string' || priceId.trim() === '') {
      return res.status(400).json({ error: 'priceId debe ser una cadena no vacía' });
    }

    // Get or create customer
    const studentResult = await pool.query(`
      SELECT onvo_customer_id FROM student WHERE id_student = $1
    `, [studentId]);

    if (studentResult.rows.length === 0 || !studentResult.rows[0].onvo_customer_id) {
      return res.status(400).json({ error: 'Estudiante no tiene customerId. Crea un cliente primero.' });
    }

    const customerId = studentResult.rows[0].onvo_customer_id;

    // Create subscription
    const subscription = await fetch('https://api.onvopay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${onvoSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerId,
        paymentBehavior: 'allow_incomplete',
        items: [{ priceId, quantity: 1 }]
        // Removed metadata field to comply with OnvoPay API
      })
    });

    const subscriptionData = await subscription.json();
    console.log('OnvoPay subscription response:', subscriptionData); // Improved logging

    if (subscriptionData.error) {
      return res.status(400).json({ 
        error: 'Error al crear la suscripción', 
        details: subscriptionData.error.message || subscriptionData.message 
      });
    }

    if (!subscriptionData.id) {
      return res.status(500).json({ error: 'No se recibió subscriptionId de OnvoPay' });
    }

    res.json({ subscriptionId: subscriptionData.id });
  } catch (error) {
    console.error('Error creating Onvo subscription:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Confirm Onvo Subscription
router.post('/confirm-onvo-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId, cursoId, studentId } = req.body;
    if (!subscriptionId || !cursoId || !studentId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Verify subscription status
    const subscription = await fetch(`https://api.onvopay.com/v1/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${onvoSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const subscriptionData = await subscription.json();
    if (subscriptionData.error) {
      return res.status(400).json({ error: subscriptionData.error.message });
    }

    if (subscriptionData.status === 'active') {
      // Update subscription in database
      await pool.query(`
        INSERT INTO suscription (id_student, id_lx, status, currentprogress, validthru, onvo_subscription_id)
        VALUES ($1, $2, 'active', 0, $3, $4)
        ON CONFLICT (id_student, id_lx) DO UPDATE
        SET status = 'active', currentprogress = 0, validthru = $3, onvo_subscription_id = $4
      `, [studentId, cursoId, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), subscriptionId]);
      res.json({ status: subscriptionData.status });
    } else {
      res.status(400).json({ error: 'Suscripción no activa' });
    }
  } catch (error) {
    console.error('Error confirming Onvo subscription:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Create Onvo Payment Intent (for 6-month payment)
router.post('/create-onvo-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { cursoId, studentId, amount } = req.body;
    if (!cursoId || !studentId || !amount) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const paymentIntent = await fetch('https://api.onvo.co/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${onvoSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency: 'USD',
        payment_method_types: ['card'],
        description: `Pago por el curso ID: ${cursoId} (6 meses)`,
        metadata: { cursoId, studentId }
      })
    });

    const paymentIntentData = await paymentIntent.json();
    if (paymentIntentData.error) {
      return res.status(400).json({ error: paymentIntentData.error.message });
    }

    res.json({ paymentIntentId: paymentIntentData.id });
  } catch (error) {
    console.error('Error creating Onvo payment intent:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Capture Onvo Payment (for 6-month payment)
router.post('/capture-onvo-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, cursoId, studentId } = req.body;
    if (!paymentIntentId || !cursoId || !studentId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const capture = await fetch(`https://api.onvo.co/v1/payment_intents/${paymentIntentId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${onvoSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const captureData = await capture.json();
    if (captureData.error) {
      return res.status(400).json({ error: captureData.error.message });
    }

    await pool.query(`
      INSERT INTO suscription (id_student, id_lx, status, currentprogress, validthru)
      VALUES ($1, $2, 'active', 0, $3)
      ON CONFLICT (id_student, id_lx) DO UPDATE
      SET status = 'active', currentprogress = 0, validthru = $3
    `, [studentId, cursoId, new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)]);

    res.json({ status: captureData.status });
  } catch (error) {
    console.error('Error capturing Onvo payment:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

module.exports = router;