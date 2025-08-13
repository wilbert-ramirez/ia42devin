const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
    res.json({
        message: '✅ Ruta de inscripciones funcionando',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;