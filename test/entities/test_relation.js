module.exports = {
    collection: {
        name: "test_relation",
        attributes: {
            name: {type: "string", required: true},
            related_id: {
                type: 'id',
                entity: 'test_entity',
                role: 'related',
                foreign: '_id',
                transfer: {'related_name': 'name'}
            },
            related_name: "string"
        }
    },
    disable_delete_bulk: false,
    interceptors: {
        all: [function(req, res, next) {
            res.set('test-field', 'it.works');
            next();
        }]
    }
};