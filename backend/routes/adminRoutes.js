const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../config/db');
const { checkAdminAuth } = require('../utils/auth');

router.post('/add', async (req, res) => {
    const requiredFields = ['admin_id', 'email', 'password_hash', 'fullName'];
    for (const field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).send({ status: false, message: `Missing field: ${field}` });
        }
    }

    try {
        const hashedPassword = await bcrypt.hash(req.body.password_hash, 10);
        const details = { ...req.body, password_hash: hashedPassword };

        const sql = 'INSERT INTO admins SET ?';
        db.query(sql, details, (error) => {
            if (error) {
                console.error('Database error:', error);
                return res.send({ status: false, message: 'Error adding admin' });
            }
            res.send({ status: true, message: 'Admin added successfully' });
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

    const sql = 'SELECT * FROM admins WHERE email = ?';
    db.query(sql, [email], async (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send({ status: false, message: 'Server error' });
        }

        if (results.length === 0) {
            return res.send({ status: false, message: 'User not found' });
        }

        const admin = results[0];
        let isMatch = await bcrypt.compare(password_hash, admin.password_hash);
        if (!isMatch && password_hash === admin.password_hash) {
            isMatch = true;
            const newHash = await bcrypt.hash(password_hash, 10);
            const updateSql = 'UPDATE admins SET password_hash = ? WHERE admin_id = ?';
            db.query(updateSql, [newHash, admin.admin_id], (updateErr) => {
                if (updateErr) console.error('Failed to upgrade password:', updateErr);
            });
        }

        if (isMatch) {
            req.session.user = { id: admin.admin_id, role: 'admin' };
            return res.send({ status: true, message: 'Login successful', data: admin });
        }
        res.send({ status: false, message: 'Invalid password' });
    });
});

router.get('/dashboard-stats', checkAdminAuth, (req, res) => {
    console.log('Dashboard stats requested by admin:', req.session.user);
    
    const newOrdersSql = 'SELECT COUNT(*) as new_orders FROM orders WHERE DATE(order_date) = CURDATE() AND status != "cart"';
    const pendingOrdersSql = 'SELECT COUNT(*) as pending_orders FROM orders WHERE status = "pending"';
    const totalSalesSql = 'SELECT COALESCE(SUM(oi.quantity * oi.price_at_order), 0) as total_sales FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = "completed"';

    db.query(newOrdersSql, (err1, newOrdersResult) => {
        if (err1) {
            console.error('Database error in new orders query:', err1);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        db.query(pendingOrdersSql, (err2, pendingResult) => {
            if (err2) {
                console.error('Database error in pending orders query:', err2);
                return res.status(500).send({ status: false, message: 'Database error' });
            }
            db.query(totalSalesSql, (err3, salesResult) => {
                if (err3) {
                    console.error('Database error in total sales query:', err3);
                    return res.status(500).send({ status: false, message: 'Database error' });
                }
                
                const dashboardData = {
                    newOrders: newOrdersResult[0].new_orders,
                    pendingOrders: pendingResult[0].pending_orders,
                    totalSales: parseFloat(salesResult[0].total_sales)
                };
                
                console.log('Dashboard stats response:', dashboardData);
                
                res.send({
                    status: true,
                    data: dashboardData
                });
            });
        });
    });
});

router.get('/stock-stats', checkAdminAuth, (req, res) => {
    console.log('Stock stats requested by admin:', req.session.user);
    
    // Updated SQL to match your actual database item names
    const sql = `SELECT 
                    CASE 
                        WHEN LOWER(i.name) LIKE '%male%' AND LOWER(i.name) NOT LIKE '%female%' THEN 'Mens Uniform'
                        WHEN LOWER(i.name) LIKE '%female%' THEN 'Womens Uniform'
                        WHEN LOWER(i.name) LIKE '%pe%' OR LOWER(i.name) LIKE '%physical%' THEN 'PE Uniform'
                        WHEN LOWER(i.name) LIKE '%nstp%' THEN 'NSTP Shirt'
                        ELSE 'Other'
                    END as category,
                    SUM(COALESCE(iv.stock, 0)) as total_stock
                 FROM items i
                 LEFT JOIN item_variants iv ON i.item_id = iv.item_id
                 WHERE i.is_active = 1
                 GROUP BY category
                 HAVING category IN ('Mens Uniform', 'Womens Uniform', 'PE Uniform', 'NSTP Shirt')
                 ORDER BY 
                    CASE category
                        WHEN 'Mens Uniform' THEN 1
                        WHEN 'Womens Uniform' THEN 2
                        WHEN 'PE Uniform' THEN 3
                        WHEN 'NSTP Shirt' THEN 4
                        ELSE 5
                    END`;
                    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error in stock stats query:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        
        console.log('Raw stock query results:', results);
        
        // Ensure all categories are represented, even with 0 stock
        const defaultCategories = [
            { category: 'Mens Uniform', total_stock: 0 },
            { category: 'Womens Uniform', total_stock: 0 },
            { category: 'PE Uniform', total_stock: 0 },
            { category: 'NSTP Shirt', total_stock: 0 }
        ];
        
        const stockData = defaultCategories.map(defaultCat => {
            const found = results.find(r => r.category === defaultCat.category);
            return found ? { 
                category: found.category, 
                total_stock: parseInt(found.total_stock) || 0 
            } : defaultCat;
        });
        
        console.log('Final stock data response:', stockData);
        
        res.send({ status: true, data: stockData });
    });
});

router.get('/pending-orders-by-category', checkAdminAuth, (req, res) => {
    const sql = `SELECT 
                    CASE 
                        WHEN LOWER(i.name) LIKE '%male%' AND LOWER(i.name) NOT LIKE '%female%' THEN 'Mens Uniform'
                        WHEN LOWER(i.name) LIKE '%female%' THEN 'Womens Uniform'
                        WHEN LOWER(i.name) LIKE '%pe%' OR LOWER(i.name) LIKE '%physical%' THEN 'PE Uniform'
                        WHEN LOWER(i.name) LIKE '%nstp%' THEN 'NSTP Shirt'
                        ELSE 'Other'
                    END as category,
                    COALESCE(SUM(oi.quantity), 0) as pending_count
                 FROM orders o
                 JOIN order_items oi ON o.order_id = oi.order_id
                 JOIN item_variants iv ON oi.variant_id = iv.variant_id
                 JOIN items i ON iv.item_id = i.item_id
                 WHERE o.status = 'pending'
                 GROUP BY category
                 HAVING category IN ('Mens Uniform', 'Womens Uniform', 'PE Uniform', 'NSTP Shirt')`;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        
        const defaultCategories = [
            { category: 'Mens Uniform', pending_count: 0 },
            { category: 'Womens Uniform', pending_count: 0 },
            { category: 'PE Uniform', pending_count: 0 },
            { category: 'NSTP Shirt', pending_count: 0 }
        ];
        
        const pendingData = defaultCategories.map(defaultCat => {
            const found = results.find(r => r.category === defaultCat.category);
            return found ? {
                category: found.category,
                pending_count: parseInt(found.pending_count) || 0
            } : defaultCat;
        });
        
        res.send({ status: true, data: pendingData });
    });
});

router.post('/add-stock', checkAdminAuth, (req, res) => {
    const { category, quantity } = req.body;
    if (!category || !quantity || quantity <= 0) {
        return res.status(400).send({ status: false, message: 'Invalid category or quantity' });
    }

    const sql = `UPDATE item_variants iv
                 JOIN items i ON iv.item_id = i.item_id
                 SET iv.stock = iv.stock + ?
                 WHERE CASE 
                    WHEN LOWER(i.name) LIKE '%male%' AND LOWER(i.name) NOT LIKE '%female%' THEN 'Mens Uniform'
                    WHEN LOWER(i.name) LIKE '%female%' THEN 'Womens Uniform'
                    WHEN LOWER(i.name) LIKE '%pe%' OR LOWER(i.name) LIKE '%physical%' THEN 'PE Uniform'
                    WHEN LOWER(i.name) LIKE '%nstp%' THEN 'NSTP Shirt'
                    ELSE 'Other'
                 END = ?`;
                 
    db.query(sql, [quantity, category], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        if (result.affectedRows > 0) {
            res.send({ status: true, message: `Stock added successfully. ${result.affectedRows} variants updated.` });
        } else {
            res.send({ status: false, message: 'No items found in this category to update.' });
        }
    });
});

module.exports = router;