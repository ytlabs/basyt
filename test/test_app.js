var basyt = require("../"),
    request = require('supertest'),
    basytApp,
    should = require("should"),
    user, rel,
    token;

describe('Launch Basyt Test App', function () {
    it('Instantiate basyt', function (done) {
        basytApp = new basyt();
        //wait for awhile to proceed
        setTimeout(done, 250);
    });


    it('Reset and Initialize Entities', function (done) {
        basytApp.truncateEntities();
        setTimeout(done, 500);
    });

    it('Access to discovery', function (done) {
        request(basytApp.app)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body).have.property('name');
                should(res.body).have.property('version');
                should(res.body).have.property('routes');
                should(res.body.routes).have.property('user:register');
                should(res.body.routes).have.property('user:login');
                should(res.body.routes).have.property('test_entity:read');
                should(res.body.routes).not.have.property('test_entity:create_bulk');
                done();
            });
    })
});

describe('User Registration', function () {
    it('Register a user', function (done) {
        request(basytApp.app)
            .post('/user/register')
            .send({entity: {name: "kamil", password: "123456", email: "kamil+basyt@yt.com.tr", roles: ['ADMIN']}})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body.result.email).be.exactly('kamil+basyt@yt.com.tr');
                should(res.body.result).have.property('token');
                done();
            });
    });

    it('Reject duplicate email', function (done) {
        request(basytApp.app)
            .post('/user/register')
            .send({entity: {name: "kamil 2", password: "123456", email: "kamil+basyt@yt.com.tr"}})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('email');
                should(res.body.err[0][1]).be.exactly('email_exists');
                done();
            });
    });

    it('Reject short password', function (done) {
        request(basytApp.app)
            .post('/user/register')
            .send({entity: {name: "kamil", password: "123", email: "kamil+basytx@yt.com.tr"}})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('password');
                should(res.body.err[0][1]).be.exactly('minLength');
                done();
            });
    });

    it('Reject undefined password', function (done) {
        request(basytApp.app)
            .post('/user/register')
            .send({entity: {name: "kamil", email: "kamil+basytx@yt.com.tr"}})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('password');
                should(res.body.err[0][1]).be.exactly('required');
                done();
            });
    });

    it('Reject undefined name', function (done) {
        request(basytApp.app)
            .post('/user/register')
            .send({entity: {password: "123456", email: "kamil+basytx@yt.com.tr"}})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('name');
                should(res.body.err[0][1]).be.exactly('required');
                done();
            });
    });

    it('Reject undefined email', function (done) {
        request(basytApp.app)
            .post('/user/register')
            .send({entity: {name: "kamil", password: "123456"}})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('email');
                should(res.body.err[0][1]).be.exactly('required');
                done();
            });
    });
});

describe('User Login', function () {
    it('Login with kamil+basyt@yt.com.tr', function (done) {
        request(basytApp.app)
            .post('/user/login')
            .send({email: 'kamil+basyt@yt.com.tr', password: '123456'})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body.result.email).be.exactly('kamil+basyt@yt.com.tr');
                should(res.body.result).have.property('id');
                should(res.body.result).have.property('token');
                token = res.body.result.token;
                user = res.body.result;
                done();
            });
    });
    it('Reject invalid password', function (done) {
        request(basytApp.app)
            .post('/user/login')
            .send({email: 'kamil+basyt@yt.com.tr', password: '123465'})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('password');
                should(res.body.err[0][1]).be.exactly('invalid_user_password');
                done();
            });
    });

    it('Reject undefined password', function (done) {
        request(basytApp.app)
            .post('/user/login')
            .send({email: 'kamil+basyt@yt.com.tr'})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('password');
                should(res.body.err[0][1]).be.exactly('required');
                done();
            });
    });

    it('Reject undefined email', function (done) {
        request(basytApp.app)
            .post('/user/login')
            .send({password: "asa"})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('email');
                should(res.body.err[0][1]).be.exactly('required');
                done();
            });
    });

    it('Reject no body', function (done) {
        request(basytApp.app)
            .post('/user/login')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                should(res.body).have.property('err');
                should(res.body.err[0][0]).be.exactly('email');
                should(res.body.err[0][1]).be.exactly('required');
                done();
            });
    });
    it('Read user info', function (done) {
        request(basytApp.app)
            .get('/user/' + user.id)
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                done();
            });
    });
});

describe('Test test_entity API', function () {
    var entity;
    it('Create new test_entity', function (done) {
        request(basytApp.app)
            .post('/test_entity')
            .send({entity: {name: 'test1', email: 'a@b.c', url: 'http://ab.cd.com', telephone: '1234567890'}})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                entity = res.body.result;
                done();
            });
    });
    it('Read test_entity', function (done) {
        request(basytApp.app)
            .get('/test_entity/' + entity.id)
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                should(res.body.result.id).be.exactly(entity.id);
                done();
            });
    });
    it('Create new test_entity', function (done) {
        request(basytApp.app)
            .post('/test_entity')
            .send({entity: {name: 'test2', email: 'a@b.c', url: 'http://ab.cd.com', telephone: '1234567890'}})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                entity = res.body.result;
                done();
            });
    });
    it('List test_entity', function (done) {
        request(basytApp.app)
            .get('/test_entity/list')
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                should(res.body.result.length).be.exactly(2);
                done();
            });
    });

    it('Query test_entity by http query', function (done) {
        request(basytApp.app)
            .get('/test_entity/list')
            .query({name: 'test2'})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                should(res.body.result.length).be.exactly(1);
                done();
            });
    });

    it('Query test_entity by query json', function (done) {
        request(basytApp.app)
            .put('/test_entity/list')
            .send({query: {name: 'test2'}})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                should(res.body.result.length).be.exactly(1);
                done();
            });
    });

    it('Update test_entity', function (done) {
        request(basytApp.app)
            .put('/test_entity/' + entity.id)
            .send({update: {$set: {name: 'test new'}}})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                should(res.body.result.name).be.exactly('test new');
                done();
            });
    });

    it('Reject test_relation with invalid id', function (done) {
        request(basytApp.app)
            .post('/test_relation')
            .send({entity: {name: 'test new', related_id: user.id}})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(false);
                done();
            });
    });

    it('Create related test_relation', function (done) {
        request(basytApp.app)
            .post('/test_relation')
            .send({entity: {name: 'test new', related_id: entity.id}})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                should(res.body.result).have.property('related_id');
                should(res.body.result.related_id).be.exactly(entity.id);
                rel = res.body.result;
                done();
            });
    });

    it('Deep read test_relation', function (done) {
        request(basytApp.app)
            .get('/test_relation/' + rel.id)
            .query({deep: true})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                console.log(res.body.result);
                should(res.body.result).have.property('related');
                done();
            });
    });

    it('Delete test_relation by query', function (done) {
        request(basytApp.app)
            .delete('/test_relation')
            .query({related_id: entity.id})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                done();
            });
    });

    it('Delete test_entity', function (done) {
        request(basytApp.app)
            .delete('/test_entity/' + entity.id)
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                done();
            });
    });

    it('Delete test_entity by query', function (done) {
        request(basytApp.app)
            .delete('/test_entity')
            .query({name: 'test1'})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                done();
            });
    });

    it('List test_entity', function (done) {
        request(basytApp.app)
            .get('/test_entity/list')
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                should(err).be.exactly(null);
                should(res.body.success).be.exactly(true);
                should(res.body).have.property('result');
                should(res.body.result.length).be.exactly(0);
                done();
            });
    });
});

