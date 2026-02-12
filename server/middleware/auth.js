const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'Not authenticated' });

    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }

    if (!decodedToken) return res.status(401).json({ message: 'Not authenticated' });

    req.userId = decodedToken.id;
    req.userRole = decodedToken.role;
    next();
};
