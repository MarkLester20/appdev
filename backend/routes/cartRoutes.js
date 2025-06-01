const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { checkUserAuth } = require('../utils/auth');

// Add item to cart
router.post('/add', checkUserAuth, (req, res) => {
    const { variant_id, quantity } = req.body;
    const student_id = req.session.user.student_id;

    if (!variant_id || !quantity || quantity <= 0) {
        return res.status(400).json({ 
            status: false, 
            message: 'Valid variant ID and quantity are required' 
        });
    }

    // Start transaction
    db.beginTransaction((transErr) => {
        if (transErr) {
            console.error('Transaction error:', transErr);
            return res.status(500).json({ status: false, message: 'Transaction error' });
        }

        // Check if variant exists and has enough stock
        const checkStockSql = `SELECT iv.stock, iv.price, iv.size, i.name, i.image_url
                               FROM item_variants iv
                               JOIN items i ON iv.item_id = i.item_id
                               WHERE iv.variant_id = ? AND i.is_active = 1`;

        db.query(checkStockSql, [variant_id], (err, stockResult) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Database error:', err);
                    res.status(500).json({ status: false, message: 'Database error' });
                });
            }

            if (stockResult.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ status: false, message: 'Product variant not found' });
                });
            }

            const variant = stockResult[0];
            if (variant.stock < quantity) {
                return db.rollback(() => {
                    res.status(400).json({ 
                        status: false, 
                        message: `Insufficient stock. Only ${variant.stock} items available` 
                    });
                });
            }

            // Check if user already has this variant in cart
            const checkCartSql = `SELECT cart_id, quantity FROM cart 
                                  WHERE student_id = ? AND variant_id = ?`;

            db.query(checkCartSql, [student_id, variant_id], (err2, cartResult) => {
                if (err2) {
                    return db.rollback(() => {
                        console.error('Database error:', err2);
                        res.status(500).json({ status: false, message: 'Database error' });
                    });
                }

                let cartOperation;
                let cartParams;

                if (cartResult.length > 0) {
                    // Update existing cart item
                    const newQuantity = cartResult[0].quantity + quantity;
                    
                    // Check if total quantity exceeds available stock
                    if (newQuantity > variant.stock) {
                        return db.rollback(() => {
                            res.status(400).json({ 
                                status: false, 
                                message: `Cannot add ${quantity} more items. Total would exceed available stock of ${variant.stock}` 
                            });
                        });
                    }

                    cartOperation = 'UPDATE cart SET quantity = ? WHERE cart_id = ?';
                    cartParams = [newQuantity, cartResult[0].cart_id];
                } else {
                    // Insert new cart item
                    cartOperation = 'INSERT INTO cart (student_id, variant_id, quantity) VALUES (?, ?, ?)';
                    cartParams = [student_id, variant_id, quantity];
                }

                // Execute cart operation
                db.query(cartOperation, cartParams, (err3, cartOpResult) => {
                    if (err3) {
                        return db.rollback(() => {
                            console.error('Database error:', err3);
                            res.status(500).json({ status: false, message: 'Failed to add to cart' });
                        });
                    }

                    // Reduce stock (make it pending)
                    const updateStockSql = 'UPDATE item_variants SET stock = stock - ? WHERE variant_id = ?';
                    db.query(updateStockSql, [quantity, variant_id], (err4, stockUpdateResult) => {
                        if (err4) {
                            return db.rollback(() => {
                                console.error('Database error:', err4);
                                res.status(500).json({ status: false, message: 'Failed to update stock' });
                            });
                        }

                        // Commit transaction
                        db.commit((err5) => {
                            if (err5) {
                                return db.rollback(() => {
                                    console.error('Commit error:', err5);
                                    res.status(500).json({ status: false, message: 'Transaction commit failed' });
                                });
                            }

                            res.json({
                                status: true,
                                message: 'Item added to cart successfully',
                                data: {
                                    product_name: variant.name,
                                    size: variant.size,
                                    quantity: quantity,
                                    price: variant.price,
                                    remaining_stock: variant.stock - quantity
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});


router.get('/', checkUserAuth, (req, res) => {
    const student_id = req.session.user.student_id;

    const sql = `
        SELECT c.cart_id, c.variant_id, c.quantity, 
               iv.size, iv.price, iv.stock,
               i.name AS product_name, i.image_url
        FROM cart c
        JOIN item_variants iv ON c.variant_id = iv.variant_id
        JOIN items i ON iv.item_id = i.item_id
        WHERE c.student_id = ? AND i.is_active = 1
    `;

    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error('Error fetching cart:', err);
            return res.status(500).json({ status: false, message: 'Database error' });
        }

        res.json({ status: true, cart: result });
    });
});




router.put('/:cart_id', checkUserAuth, (req, res) => {
    const { cart_id } = req.params;
    const { quantity } = req.body;
    const student_id = req.session.user.student_id;

    if (!quantity || quantity <= 0) {
        return res.status(400).json({ status: false, message: 'Quantity must be a positive number' });
    }

    
    const selectSql = `
        SELECT c.variant_id, c.quantity AS current_qty, iv.stock
        FROM cart c
        JOIN item_variants iv ON c.variant_id = iv.variant_id
        WHERE c.cart_id = ? AND c.student_id = ?
    `;

    db.query(selectSql, [cart_id, student_id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).json({ status: false, message: 'Cart item not found' });
        }

        const { variant_id, current_qty, stock } = result[0];
        const stockAdjustment = quantity - current_qty;

        if (stock < stockAdjustment) {
            return res.status(400).json({ 
                status: false, 
                message: `Not enough stock. Only ${stock} additional items available.` 
            });
        }

        db.beginTransaction(err => {
            if (err) return res.status(500).json({ status: false, message: 'Transaction error' });

            const updateCartSql = 'UPDATE cart SET quantity = ? WHERE cart_id = ?';
            const updateStockSql = 'UPDATE item_variants SET stock = stock - ? WHERE variant_id = ?';

            db.query(updateCartSql, [quantity, cart_id], err2 => {
                if (err2) return db.rollback(() => res.status(500).json({ status: false, message: 'Update failed' }));

                db.query(updateStockSql, [stockAdjustment, variant_id], err3 => {
                    if (err3) return db.rollback(() => res.status(500).json({ status: false, message: 'Stock update failed' }));

                    db.commit(err4 => {
                        if (err4) return db.rollback(() => res.status(500).json({ status: false, message: 'Commit failed' }));

                        res.json({ status: true, message: 'Cart quantity updated' });
                    });
                });
            });
        });
    });
});

// Delete item from cart
router.delete('/:cart_id', checkUserAuth, (req, res) => {
    const { cart_id } = req.params;
    const student_id = req.session.user.student_id;

    const selectSql = `
        SELECT variant_id, quantity FROM cart
        WHERE cart_id = ? AND student_id = ?
    `;

    db.query(selectSql, [cart_id, student_id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).json({ status: false, message: 'Cart item not found' });
        }

        const { variant_id, quantity } = result[0];

        db.beginTransaction(err => {
            if (err) return res.status(500).json({ status: false, message: 'Transaction error' });

            const deleteSql = 'DELETE FROM cart WHERE cart_id = ?';
            const restoreStockSql = 'UPDATE item_variants SET stock = stock + ? WHERE variant_id = ?';

            db.query(deleteSql, [cart_id], err2 => {
                if (err2) return db.rollback(() => res.status(500).json({ status: false, message: 'Delete failed' }));

                db.query(restoreStockSql, [quantity, variant_id], err3 => {
                    if (err3) return db.rollback(() => res.status(500).json({ status: false, message: 'Stock update failed' }));

                    db.commit(err4 => {
                        if (err4) return db.rollback(() => res.status(500).json({ status: false, message: 'Commit failed' }));

                        res.json({ status: true, message: 'Item removed from cart' });
                    });
                });
            });
        });
    });
});
router.post('/place-order/:cart_id', checkUserAuth, (req, res) => {
    const student_id = req.session.user.student_id;
    const cart_id = req.params.cart_id;

    const getCartItemSql = `
        SELECT c.cart_id, c.variant_id, c.quantity, iv.price
        FROM cart c
        JOIN item_variants iv ON c.variant_id = iv.variant_id
        WHERE c.student_id = ? AND c.cart_id = ?
    `;

    db.query(getCartItemSql, [student_id, cart_id], (err, cartItems) => {
        if (err) {
            console.error('Database error (getCartItemSql):', err);
            return res.status(500).json({ status: false, message: 'Database error' });
        }
        if (cartItems.length === 0) {
            return res.status(400).json({ status: false, message: 'Cart item not found' });
        }

        const createOrderSql = 'INSERT INTO orders (student_id, status, order_date) VALUES (?, "pending", NOW())';
        db.query(createOrderSql, [student_id], (err2, orderResult) => {
            if (err2) {
                console.error('Database error (createOrderSql):', err2);
                return res.status(500).json({ status: false, message: 'Failed to create order' });
            }

            const order_id = orderResult.insertId;
            const item = cartItems[0];
            const orderItems = [[order_id, item.variant_id, item.quantity, item.price]];
            const insertOrderItemsSql = 'INSERT INTO order_items (order_id, variant_id, quantity, price_at_order) VALUES ?';

            db.query(insertOrderItemsSql, [orderItems], (err3) => {
                if (err3) {
                    console.error('Database error (insertOrderItemsSql):', err3);
                    return res.status(500).json({ status: false, message: 'Failed to add order item' });
                }

                const clearCartSql = 'DELETE FROM cart WHERE cart_id = ? AND student_id = ?';
                db.query(clearCartSql, [cart_id, student_id], (err4) => {
                    if (err4) {
                        console.error('Database error (clearCartSql):', err4);
                        return res.status(500).json({ status: false, message: 'Failed to remove cart item' });
                    }

                    res.json({ status: true, message: 'Order placed for this item successfully' });
                });
            });
        });
    });
});
module.exports = router;