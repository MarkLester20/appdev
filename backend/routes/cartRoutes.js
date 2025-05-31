const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { checkUserAuth } = require('../utils/auth');

// Add item to cart
router.post('/add', checkUserAuth, (req, res) => {
    const { variant_id, quantity } = req.body;
    const user_id = req.session.user.id;

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
                                  WHERE user_id = ? AND variant_id = ?`;

            db.query(checkCartSql, [user_id, variant_id], (err2, cartResult) => {
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
                    cartOperation = 'INSERT INTO cart (user_id, variant_id, quantity) VALUES (?, ?, ?)';
                    cartParams = [user_id, variant_id, quantity];
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

// Get user's cart items
router.get('/', checkUserAuth, (req, res) => {
    const user_id = req.session.user.id;

    const sql = `SELECT 
                    c.cart_id, c.quantity, c.added_at,
                    iv.variant_id, iv.size, iv.price, iv.stock,
                    i.item_id, i.name, i.description, i.image_url
                 FROM cart c
                 JOIN item_variants iv ON c.variant_id = iv.variant_id
                 JOIN items i ON iv.item_id = i.item_id
                 WHERE c.user_id = ? AND i.is_active = 1
                 ORDER BY c.added_at DESC`;

    db.query(sql, [user_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error' });
        }

        const cartItems = results.map(item => ({
            cart_id: item.cart_id,
            variant_id: item.variant_id,
            item_id: item.item_id,
            name: item.name,
            description: item.description,
            image_url: item.image_url,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
            added_at: item.added_at,
            available_stock: item.stock
        }));

        const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

        res.json({
            status: true,
            data: {
                items: cartItems,
                total_items: cartItems.length,
                total_amount: total
            }
        });
    });
});

// Update cart item quantity
router.put('/update/:cartId', checkUserAuth, (req, res) => {
    const { cartId } = req.params;
    const { quantity } = req.body;
    const user_id = req.session.user.id;

    if (!quantity || quantity <= 0) {
        return res.status(400).json({ 
            status: false, 
            message: 'Valid quantity is required' 
        });
    }

    // Start transaction
    db.beginTransaction((transErr) => {
        if (transErr) {
            console.error('Transaction error:', transErr);
            return res.status(500).json({ status: false, message: 'Transaction error' });
        }

        // Get current cart item and check ownership
        const getCartSql = `SELECT c.quantity as current_quantity, c.variant_id,
                                   iv.stock, iv.price, iv.size, i.name
                            FROM cart c
                            JOIN item_variants iv ON c.variant_id = iv.variant_id
                            JOIN items i ON iv.item_id = i.item_id
                            WHERE c.cart_id = ? AND c.user_id = ?`;

        db.query(getCartSql, [cartId, user_id], (err, cartResult) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Database error:', err);
                    res.status(500).json({ status: false, message: 'Database error' });
                });
            }

            if (cartResult.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ status: false, message: 'Cart item not found' });
                });
            }

            const cartItem = cartResult[0];
            const quantityDifference = quantity - cartItem.current_quantity;
            const newAvailableStock = cartItem.stock - quantityDifference;

            // Check if there's enough stock for the new quantity
            if (newAvailableStock < 0) {
                return db.rollback(() => {
                    res.status(400).json({ 
                        status: false, 
                        message: `Insufficient stock. Available: ${cartItem.stock + cartItem.current_quantity}` 
                    });
                });
            }

            // Update cart quantity
            const updateCartSql = 'UPDATE cart SET quantity = ? WHERE cart_id = ? AND user_id = ?';
            db.query(updateCartSql, [quantity, cartId, user_id], (err2) => {
                if (err2) {
                    return db.rollback(() => {
                        console.error('Database error:', err2);
                        res.status(500).json({ status: false, message: 'Failed to update cart' });
                    });
                }

                // Update stock based on quantity difference
                const updateStockSql = 'UPDATE item_variants SET stock = stock - ? WHERE variant_id = ?';
                db.query(updateStockSql, [quantityDifference, cartItem.variant_id], (err3) => {
                    if (err3) {
                        return db.rollback(() => {
                            console.error('Database error:', err3);
                            res.status(500).json({ status: false, message: 'Failed to update stock' });
                        });
                    }

                    // Commit transaction
                    db.commit((err4) => {
                        if (err4) {
                            return db.rollback(() => {
                                console.error('Commit error:', err4);
                                res.status(500).json({ status: false, message: 'Transaction commit failed' });
                            });
                        }

                        res.json({
                            status: true,
                            message: 'Cart updated successfully',
                            data: {
                                cart_id: cartId,
                                new_quantity: quantity,
                                new_subtotal: quantity * cartItem.price
                            }
                        });
                    });
                });
            });
        });
    });
});

// Remove item from cart
router.delete('/remove/:cartId', checkUserAuth, (req, res) => {
    const { cartId } = req.params;
    const user_id = req.session.user.id;

    // Start transaction
    db.beginTransaction((transErr) => {
        if (transErr) {
            console.error('Transaction error:', transErr);
            return res.status(500).json({ status: false, message: 'Transaction error' });
        }

        // Get cart item details before deletion
        const getCartSql = `SELECT c.quantity, c.variant_id
                            FROM cart c
                            WHERE c.cart_id = ? AND c.user_id = ?`;

        db.query(getCartSql, [cartId, user_id], (err, cartResult) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Database error:', err);
                    res.status(500).json({ status: false, message: 'Database error' });
                });
            }

            if (cartResult.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ status: false, message: 'Cart item not found' });
                });
            }

            const cartItem = cartResult[0];

            // Delete cart item
            const deleteCartSql = 'DELETE FROM cart WHERE cart_id = ? AND user_id = ?';
            db.query(deleteCartSql, [cartId, user_id], (err2, result) => {
                if (err2) {
                    return db.rollback(() => {
                        console.error('Database error:', err2);
                        res.status(500).json({ status: false, message: 'Failed to remove from cart' });
                    });
                }

                // Restore stock
                const restoreStockSql = 'UPDATE item_variants SET stock = stock + ? WHERE variant_id = ?';
                db.query(restoreStockSql, [cartItem.quantity, cartItem.variant_id], (err3) => {
                    if (err3) {
                        return db.rollback(() => {
                            console.error('Database error:', err3);
                            res.status(500).json({ status: false, message: 'Failed to restore stock' });
                        });
                    }

                    // Commit transaction
                    db.commit((err4) => {
                        if (err4) {
                            return db.rollback(() => {
                                console.error('Commit error:', err4);
                                res.status(500).json({ status: false, message: 'Transaction commit failed' });
                            });
                        }

                        res.json({
                            status: true,
                            message: 'Item removed from cart successfully',
                            data: {
                                removed_quantity: cartItem.quantity
                            }
                        });
                    });
                });
            });
        });
    });
});

// Clear entire cart
router.delete('/clear', checkUserAuth, (req, res) => {
    const user_id = req.session.user.id;

    // Start transaction
    db.beginTransaction((transErr) => {
        if (transErr) {
            console.error('Transaction error:', transErr);
            return res.status(500).json({ status: false, message: 'Transaction error' });
        }

        // Get all cart items to restore stock
        const getCartItemsSql = `SELECT c.quantity, c.variant_id
                                 FROM cart c
                                 WHERE c.user_id = ?`;

        db.query(getCartItemsSql, [user_id], (err, cartItems) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Database error:', err);
                    res.status(500).json({ status: false, message: 'Database error' });
                });
            }

            // Delete all cart items for user
            const clearCartSql = 'DELETE FROM cart WHERE user_id = ?';
            db.query(clearCartSql, [user_id], (err2) => {
                if (err2) {
                    return db.rollback(() => {
                        console.error('Database error:', err2);
                        res.status(500).json({ status: false, message: 'Failed to clear cart' });
                    });
                }

                // Restore stock for all removed items
                if (cartItems.length > 0) {
                    const restorePromises = cartItems.map(item => {
                        return new Promise((resolve, reject) => {
                            const restoreStockSql = 'UPDATE item_variants SET stock = stock + ? WHERE variant_id = ?';
                            db.query(restoreStockSql, [item.quantity, item.variant_id], (err3) => {
                                if (err3) reject(err3);
                                else resolve();
                            });
                        });
                    });

                    Promise.all(restorePromises)
                        .then(() => {
                            db.commit((err4) => {
                                if (err4) {
                                    return db.rollback(() => {
                                        console.error('Commit error:', err4);
                                        res.status(500).json({ status: false, message: 'Transaction commit failed' });
                                    });
                                }

                                res.json({
                                    status: true,
                                    message: 'Cart cleared successfully',
                                    data: {
                                        items_removed: cartItems.length
                                    }
                                });
                            });
                        })
                        .catch((stockErr) => {
                            db.rollback(() => {
                                console.error('Stock restore error:', stockErr);
                                res.status(500).json({ status: false, message: 'Failed to restore stock' });
                            });
                        });
                } else {
                    // No items to restore, just commit
                    db.commit((err4) => {
                        if (err4) {
                            return db.rollback(() => {
                                console.error('Commit error:', err4);
                                res.status(500).json({ status: false, message: 'Transaction commit failed' });
                            });
                        }

                        res.json({
                            status: true,
                            message: 'Cart was already empty',
                            data: {
                                items_removed: 0
                            }
                        });
                    });
                }
            });
        });
    });
});

module.exports = router;