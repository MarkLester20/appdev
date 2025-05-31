const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../config/db');
const { checkAdminAuth } = require('../utils/auth');

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG images are allowed'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/upload', upload.single('image'), (req, res) => {
    const { name, description, variants } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !variants) {
        return res.status(400).json({ status: false, message: 'Missing required fields.' });
    }

    const itemSql = 'INSERT INTO items (name, description, image_url) VALUES (?, ?, ?)';
    db.query(itemSql, [name, description || '', image_url], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Failed to add item.' });
        }
        const item_id = result.insertId;
        
        let variantsArr;
        try {
            variantsArr = JSON.parse(variants);
        } catch (e) {
            return res.status(400).json({ status: false, message: 'Invalid variants format.' });
        }

        const variantSql = 'INSERT INTO item_variants (item_id, size, stock, price) VALUES ?';
        const variantValues = variantsArr.map(v => [item_id, v.size, v.stock, v.price]);
        db.query(variantSql, [variantValues], (err2) => {
            if (err2) {
                console.error('Database error:', err2);
                return res.status(500).json({ status: false, message: 'Failed to add variants.' });
            }
            res.json({ status: true, message: 'Item and variants added successfully.' });
        });
    });
});

// NEW: Get single product details (PUBLIC ENDPOINT)
router.get('/:itemId/details', (req, res) => {
    const { itemId } = req.params;
    
    const sql = `SELECT 
                    i.item_id, i.name, i.description, i.image_url, i.is_active,
                    iv.variant_id, iv.size, iv.stock, iv.price
                 FROM items i
                 LEFT JOIN item_variants iv ON i.item_id = iv.item_id
                 WHERE i.item_id = ? AND i.is_active = 1
                 ORDER BY iv.size`;
    
    db.query(sql, [itemId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).send({ status: false, message: 'Product not found' });
        }
        
        // Group variants under the item
        const item = {
            item_id: results[0].item_id,
            name: results[0].name,
            description: results[0].description,
            image_url: results[0].image_url,
            is_active: results[0].is_active,
            variants: []
        };
        
        results.forEach(row => {
            if (row.variant_id) {
                item.variants.push({
                    variant_id: row.variant_id,
                    size: row.size,
                    stock: row.stock,
                    price: row.price
                });
            }
        });
        
        res.send({ status: true, data: item });
    });
});

// NEW: Update item details including image
router.put('/:itemId', checkAdminAuth, upload.single('image'), (req, res) => {
    const { itemId } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
        return res.status(400).json({ status: false, message: 'Item name is required.' });
    }

    // First get the current item to handle old image deletion if new image is uploaded
    const getCurrentItemSql = 'SELECT image_url FROM items WHERE item_id = ?';
    db.query(getCurrentItemSql, [itemId], (err, currentItem) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error' });
        }

        if (currentItem.length === 0) {
            return res.status(404).json({ status: false, message: 'Item not found' });
        }

        let updateFields = ['name = ?', 'description = ?'];
        let updateValues = [name, description || ''];
        
        // If new image is uploaded, add it to update fields
        if (req.file) {
            const new_image_url = `/uploads/${req.file.filename}`;
            updateFields.push('image_url = ?');
            updateValues.push(new_image_url);
            
            // Delete old image file if it exists
            const oldImagePath = currentItem[0].image_url;
            if (oldImagePath) {
                const fullOldPath = path.join(__dirname, '..', oldImagePath);
                fs.unlink(fullOldPath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.log('Could not delete old image:', unlinkErr);
                    }
                });
            }
        }

        updateValues.push(itemId);
        const updateSql = `UPDATE items SET ${updateFields.join(', ')} WHERE item_id = ?`;
        
        db.query(updateSql, updateValues, (updateErr, result) => {
            if (updateErr) {
                console.error('Database error:', updateErr);
                return res.status(500).json({ status: false, message: 'Failed to update item' });
            }
            
            if (result.affectedRows > 0) {
                res.json({ status: true, message: 'Item updated successfully' });
            } else {
                res.status(404).json({ status: false, message: 'Item not found' });
            }
        });
    });
});

// NEW: Update only item image
router.put('/:itemId/image', checkAdminAuth, upload.single('image'), (req, res) => {
    const { itemId } = req.params;
    
    if (!req.file) {
        return res.status(400).json({ status: false, message: 'No image file provided' });
    }

    const new_image_url = `/uploads/${req.file.filename}`;
    
    // Get current image to delete old file
    const getCurrentImageSql = 'SELECT image_url FROM items WHERE item_id = ?';
    db.query(getCurrentImageSql, [itemId], (err, currentItem) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error' });
        }

        if (currentItem.length === 0) {
            return res.status(404).json({ status: false, message: 'Item not found' });
        }

        // Update image_url in database
        const updateSql = 'UPDATE items SET image_url = ? WHERE item_id = ?';
        db.query(updateSql, [new_image_url, itemId], (updateErr, result) => {
            if (updateErr) {
                console.error('Database error:', updateErr);
                return res.status(500).json({ status: false, message: 'Failed to update image' });
            }
            
            if (result.affectedRows > 0) {
                // Delete old image file if it exists
                const oldImagePath = currentItem[0].image_url;
                if (oldImagePath) {
                    const fullOldPath = path.join(__dirname, '..', oldImagePath);
                    fs.unlink(fullOldPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.log('Could not delete old image:', unlinkErr);
                        }
                    });
                }
                
                res.json({ 
                    status: true, 
                    message: 'Image updated successfully',
                    image_url: new_image_url
                });
            } else {
                res.status(404).json({ status: false, message: 'Item not found' });
            }
        });
    });
});

router.get('/featured', (req, res) => {
    const sql = `SELECT i.item_id, i.name, i.description, i.image_url,
                        MIN(iv.price) as min_price,
                        MAX(iv.price) as max_price,
                        SUM(iv.stock) as total_stock
                 FROM items i
                 JOIN item_variants iv ON i.item_id = iv.item_id
                 WHERE i.is_active = 1
                 GROUP BY i.item_id
                 HAVING total_stock > 0
                 ORDER BY i.item_id DESC
                 LIMIT 6`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        res.send({ status: true, data: results });
    });
});

router.get('/categories/stats', (req, res) => {
    const sql = `SELECT 
                    CASE 
                        WHEN LOWER(i.name) LIKE '%men%' AND LOWER(i.name) NOT LIKE '%women%' THEN 'Mens Uniform'
                        WHEN LOWER(i.name) LIKE '%women%' OR LOWER(i.name) LIKE '%female%' THEN 'Womens Uniform'
                        WHEN LOWER(i.name) LIKE '%pe%' OR LOWER(i.name) LIKE '%physical%' THEN 'PE Uniform'
                        WHEN LOWER(i.name) LIKE '%nstp%' THEN 'NSTP Shirt'
                        ELSE 'Other'
                    END as category,
                    COUNT(DISTINCT i.item_id) as item_count,
                    SUM(iv.stock) as total_stock
                 FROM items i
                 JOIN item_variants iv ON i.item_id = iv.item_id
                 WHERE i.is_active = 1
                 GROUP BY category
                 HAVING category IN ('Mens Uniform', 'Womens Uniform', 'PE Uniform', 'NSTP Shirt')`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        res.send({ status: true, data: results });
    });
});

router.get('/all', checkAdminAuth, (req, res) => {
    const sql = `SELECT 
                    i.item_id, i.name, i.description, i.image_url, i.is_active,
                    iv.variant_id, iv.size, iv.stock, iv.price
                 FROM items i
                 LEFT JOIN item_variants iv ON i.item_id = iv.item_id
                 ORDER BY i.item_id, iv.size`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        const itemsMap = new Map();
        results.forEach(row => {
            if (!itemsMap.has(row.item_id)) {
                itemsMap.set(row.item_id, {
                    item_id: row.item_id,
                    name: row.name,
                    description: row.description,
                    image_url: row.image_url,
                    is_active: row.is_active,
                    variants: []
                });
            }
            if (row.variant_id) {
                itemsMap.get(row.item_id).variants.push({
                    variant_id: row.variant_id,
                    size: row.size,
                    stock: row.stock,
                    price: row.price
                });
            }
        });
        const items = Array.from(itemsMap.values());
        res.send({ status: true, data: items });
    });
});

router.put('/:itemId/status', checkAdminAuth, (req, res) => {
    const { itemId } = req.params;
    const { is_active } = req.body;
    if (is_active === undefined || (is_active !== 0 && is_active !== 1)) {
        return res.status(400).send({ status: false, message: 'Invalid status value. Must be 0 or 1.' });
    }

    const sql = 'UPDATE items SET is_active = ? WHERE item_id = ?';
    db.query(sql, [is_active, itemId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        if (result.affectedRows > 0) {
            const action = is_active === 1 ? 'activated' : 'deactivated';
            res.send({ status: true, message: `Item ${action} successfully` });
        } else {
            res.status(404).send({ status: false, message: 'Item not found' });
        }
    });
});

router.put('/variants/:variantId', checkAdminAuth, (req, res) => {
    const { variantId } = req.params;
    const { stock, price } = req.body;
    if (stock === undefined || price === undefined || stock < 0 || price < 0) {
        return res.status(400).send({ status: false, message: 'Stock and price must be provided and non-negative' });
    }

    const sql = 'UPDATE item_variants SET stock = ?, price = ? WHERE variant_id = ?';
    db.query(sql, [stock, price, variantId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }
        if (result.affectedRows > 0) {
            res.send({ status: true, message: 'Variant updated successfully' });
        } else {
            res.status(404).send({ status: false, message: 'Variant not found' });
        }
    });
});

// Add this route to your itemRoutes.js file, after the existing routes

// NEW: Get products by category (PUBLIC ENDPOINT)
router.get('/category/:category', (req, res) => {
    const { category } = req.params;
    
    // Map frontend category names to database search patterns
    let categoryCondition;
    const categoryLower = category.toLowerCase();
    
    switch(categoryLower) {
        case 'women':
        case 'womens':
            categoryCondition = "(LOWER(i.name) LIKE '%women%' OR LOWER(i.name) LIKE '%female%')";
            break;
        case 'men':
        case 'mens':
            categoryCondition = "(LOWER(i.name) LIKE '%men%' AND LOWER(i.name) NOT LIKE '%women%')";
            break;
        case 'pe':
            categoryCondition = "(LOWER(i.name) LIKE '%pe%' OR LOWER(i.name) LIKE '%physical%')";
            break;
        case 'nstp':
            categoryCondition = "LOWER(i.name) LIKE '%nstp%'";
            break;
        default:
            return res.status(400).json({ 
                status: false, 
                message: 'Invalid category. Valid categories: women, men, pe, nstp' 
            });
    }
    
    const sql = `SELECT 
                    i.item_id, i.name, i.description, i.image_url, i.is_active,
                    iv.variant_id, iv.size, iv.stock, iv.price
                 FROM items i
                 LEFT JOIN item_variants iv ON i.item_id = iv.item_id
                 WHERE i.is_active = 1 AND ${categoryCondition}
                 ORDER BY i.item_id, iv.size`;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error' });
        }
        
        // Group variants under items
        const itemsMap = new Map();
        results.forEach(row => {
            if (!itemsMap.has(row.item_id)) {
                itemsMap.set(row.item_id, {
                    item_id: row.item_id,
                    name: row.name,
                    description: row.description,
                    image_url: row.image_url,
                    is_active: row.is_active,
                    category: category,
                    variants: []
                });
            }
            if (row.variant_id) {
                itemsMap.get(row.item_id).variants.push({
                    variant_id: row.variant_id,
                    size: row.size,
                    stock: row.stock,
                    price: row.price
                });
            }
        });
        
        const items = Array.from(itemsMap.values());
        
        // Add min/max price for each item
        items.forEach(item => {
            if (item.variants.length > 0) {
                const prices = item.variants.map(v => v.price);
                item.min_price = Math.min(...prices);
                item.max_price = Math.max(...prices);
            }
        });
        
        res.json({ 
            status: true, 
            data: items,
            category: category,
            count: items.length
        });
    });
});

router.delete('/:itemId', checkAdminAuth, (req, res) => {
    const { itemId } = req.params;
    
    // First get the item to delete its image file
    const getItemSql = 'SELECT image_url FROM items WHERE item_id = ?';
    db.query(getItemSql, [itemId], (err, item) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ status: false, message: 'Database error' });
        }

        db.beginTransaction((transErr) => {
            if (transErr) {
                console.error('Transaction error:', transErr);
                return res.status(500).send({ status: false, message: 'Transaction error' });
            }
            
            db.query('DELETE FROM item_variants WHERE item_id = ?', [itemId], (err1) => {
                if (err1) {
                    return db.rollback(() => {
                        console.error('Database error:', err1);
                        res.status(500).send({ status: false, message: 'Database error' });
                    });
                }
                
                db.query('DELETE FROM items WHERE item_id = ?', [itemId], (err2, result) => {
                    if (err2) {
                        return db.rollback(() => {
                            console.error('Database error:', err2);
                            res.status(500).send({ status: false, message: 'Database error' });
                        });
                    }
                    
                    db.commit((err3) => {
                        if (err3) {
                            return db.rollback(() => {
                                console.error('Commit error:', err3);
                                res.status(500).send({ status: false, message: 'Commit error' });
                            });
                        }
                        
                        if (result.affectedRows > 0) {
                            // Delete image file if it exists
                            if (item.length > 0 && item[0].image_url) {
                                const imagePath = path.join(__dirname, '..', item[0].image_url);
                                fs.unlink(imagePath, (unlinkErr) => {
                                    if (unlinkErr) {
                                        console.log('Could not delete image file:', unlinkErr);
                                    }
                                });
                            }
                            res.send({ status: true, message: 'Item deleted successfully' });
                        } else {
                            res.status(404).send({ status: false, message: 'Item not found' });
                        }
                    });
                });
            });
        });
    });
});

module.exports = router;