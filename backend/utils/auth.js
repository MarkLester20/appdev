const checkUserAuth = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        return res.status(401).send({ status: false, message: 'Unauthorized: No user logged in' });
    }
    next();
};

const checkAdminAuth = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(401).send({ status: false, message: 'Unauthorized: No admin logged in' });
    }
    next();
};

module.exports = { checkUserAuth, checkAdminAuth };