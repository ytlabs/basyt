module.exports = {
    action: {
        path: '/action',
        method: 'get',
        auth_level: 'ANON',
        action: function (req, res) {
            return res.json({success: true});
        }
    }
};