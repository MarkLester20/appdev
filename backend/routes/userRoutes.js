const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../config/db');
const { checkUserAuth } = require('../utils/auth');

router.post('/add', async (req, res) => {
    const requiredFields = ['student_id', 'email', 'password_hash', 'fullName'];
    for (const field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).send({ status: false, message: `Missing field: ${field}` });
        }
    }

    try {
        const hashedPassword = await bcrypt.hash(req.body.password_hash, 10);
        const details = { ...req.body, password_hash: hashedPassword };

        const sql = 'INSERT INTO users SET ?';
        db.query(sql, details, (error) => {
            if (error) {
                console.error('Database error:', error);
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.send({ status: false, message: 'Student ID or email already exists' });
                }
                return res.send({ status: false, message: 'Error adding user' });
            }
            res.send({ status: true, message: 'User added successfully' });
        });
    } catch (err) {
        console.error('Hashing error:', err);
        res.status(500).send({ status: false, message: 'Password hashing failed' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password_hash } = req.body;
    if (!email || !password_hash) {
        return res.status(400).send({ status: false, message: 'Email and password are required' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send({ status: false, message: 'Server error' });
        }

        if (results.length === 0) {
            return res.send({ status: false, message: 'User not found' });
        }

        const user = results[0];
        let isMatch = await bcrypt.compare(password_hash, user.password_hash);
        if (!isMatch && password_hash === user.password_hash) {
            isMatch = true;
            const newHash = await bcrypt.hash(password_hash, 10);
            const updateSql = 'UPDATE users SET password_hash = ? WHERE student_id = ?';
            db.query(updateSql, [newHash, user.student_id], (updateErr) => {
                if (updateErr) console.error('Failed to upgrade password:', updateErr);
            });
        }

        if (isMatch) {
            req.session.user = { student_id: user.student_id, role: 'user' };
            return res.send({ status: true, message: 'Login successful', data: user });
        }
        res.send({ status: false, message: 'Invalid password' });
    });
});

router.get('/profile', checkUserAuth, (req, res) => {
    const sql = 'SELECT fullName FROM users WHERE student_id = ?';
    db.query(sql, [req.session.user.student_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        if (results.length > 0) {
            res.send({ status: true, data: { fullName: results[0].fullName } });
        } else {
            res.status(404).send({ status: false, message: 'User not found' });
        }
    });
});

router.get('/dashboard-stats', checkUserAuth, (req, res) => {
    const ordersSql = 'SELECT COUNT(*) as total_orders FROM orders WHERE student_id = ?';
    const pendingOrdersSql = 'SELECT COUNT(*) as pending_orders FROM orders WHERE student_id = ? AND status = "pending"';
    const cartItemsSql = 'SELECT COALESCE(SUM(quantity), 0) as cart_items FROM cart WHERE student_id = ?';

    db.query(ordersSql, [req.session.user.student_id], (err1, ordersResult) => {
        if (err1) {
            console.error('Database error:', err1);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        db.query(pendingOrdersSql, [req.session.user.student_id], (err2, pendingResult) => {
            if (err2) {
                console.error('Database error:', err2);
                return res.status(500).send({ status: false, message: 'Database error' });
            }
            db.query(cartItemsSql, [req.session.user.student_id], (err3, cartResult) => {
                if (err3) {
                    console.error('Database error:', err3);
                    return res.status(500).send({ status: false, message: 'Database error' });
                }
                res.send({
                    status: true,
                    data: {
                        totalOrders: ordersResult[0].total_orders,
                        pendingOrders: pendingResult[0].pending_orders,
                        cartItems: cartResult[0].cart_items
                    }
                });
            });
        });
    });
});

router.get('/recent-orders', checkUserAuth, (req, res) => {
    const sql = `
        SELECT o.order_id, o.status, o.order_date, 
               GROUP_CONCAT(CONCAT(i.name, ' (', iv.size, ')') SEPARATOR ', ') as items,
               SUM(oi.quantity * oi.price_at_order) as total_amount
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN item_variants iv ON oi.variant_id = iv.variant_id
        JOIN items i ON iv.item_id = i.item_id
        WHERE o.student_id = ?
        
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
        LIMIT 5`;
    db.query(sql, [req.session.user.student_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        res.send({ status: true, data: results });
    });
});
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).send({ status: false, message: 'Logout failed' });
        }

        res.clearCookie('connect.sid', {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            domain: 'localhost'
        });

        console.log('Session destroyed successfully');
        return res.send({ status: true, message: 'Logout successful' });
    });
});

module.exports = router;