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
            return res.send({ status: false, message: 'Admin not found' });
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
    const totalSalesSql = 'SELECT COALESCE(SUM(oi.quantity * oi.price_at_order), 0) as total_sales FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = "paid"';

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
    const sql = `SELECT 
                    CASE 
                        WHEN LOWER(i.name) LIKE '%men%' AND LOWER(i.name) NOT LIKE '%women%' THEN 'Mens Uniform'
                        WHEN LOWER(i.name) LIKE '%women%' THEN 'Womens Uniform'
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
router.get('/orders', checkAdminAuth, (req, res) => {
    const sql = `
        SELECT 
            o.order_id,
            o.status,
            o.order_date,
            u.student_id,
            u.fullName,
            u.email,
            GROUP_CONCAT(CONCAT(oi.quantity, 'x ', i.name, ' (', iv.size, ')') SEPARATOR ', ') as items,
            SUM(oi.quantity * oi.price_at_order) as total_amount
        FROM orders o
        JOIN users u ON o.student_id = u.student_id
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN item_variants iv ON oi.variant_id = iv.variant_id
        JOIN items i ON iv.item_id = i.item_id
        WHERE o.status = 'pending'
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        res.send({ status: true, data: results });
    });
});
router.put('/orders/:order_id/paid', checkAdminAuth, (req, res) => {
    const order_id = req.params.order_id;

    // 1. Get all items in the order
    const getOrderItemsSql = `
        SELECT oi.variant_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = ?
    `;
    db.query(getOrderItemsSql, [order_id], (err, items) => {
        if (err) return res.status(500).json({ status: false, message: 'Failed to get order items' });

        // 2. Update stock for each variant
        let queries = items.map(item => {
            return new Promise((resolve, reject) => {
                db.query(
                    'UPDATE item_variants SET stock = stock - ? WHERE variant_id = ?',
                    [item.quantity, item.variant_id],
                    (err2) => err2 ? reject(err2) : resolve()
                );
            });
        });

        Promise.all(queries)
            .then(() => {
                // 3. Update order status to 'paid'
                db.query('UPDATE orders SET status = "paid" WHERE order_id = ?', [order_id], (err3) => {
                    if (err3) return res.status(500).json({ status: false, message: 'Failed to update order status' });
                    res.json({ status: true, message: 'Order marked as paid' });
                });
            })
            .catch(() => res.status(500).json({ status: false, message: 'Failed to update stock' }));
    });
});

// Expire (delete) order
router.delete('/orders/:order_id', checkAdminAuth, (req, res) => {
    const order_id = req.params.order_id;
    // Delete order_items first due to FK constraint, then order
    db.query('DELETE FROM order_items WHERE order_id = ?', [order_id], (err) => {
        if (err) return res.status(500).json({ status: false, message: 'Failed to delete order items' });
        db.query('DELETE FROM orders WHERE order_id = ?', [order_id], (err2) => {
            if (err2) return res.status(500).json({ status: false, message: 'Failed to delete order' });
            res.json({ status: true, message: 'Order expired and deleted' });
        });
    });
});
router.get('/orders/history', checkAdminAuth, (req, res) => {
    const sql = `
        SELECT 
            o.order_id,
            o.status,
            o.order_date,
            u.student_id,
            u.fullName,
            u.email,
            GROUP_CONCAT(CONCAT(oi.quantity, 'x ', i.name, ' (', iv.size, ')') SEPARATOR ', ') as items,
            SUM(oi.quantity * oi.price_at_order) as total_amount
        FROM orders o
        JOIN users u ON o.student_id = u.student_id
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN item_variants iv ON oi.variant_id = iv.variant_id
        JOIN items i ON iv.item_id = i.item_id
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        res.send({ status: true, data: results });
    });
});
module.exports = router;