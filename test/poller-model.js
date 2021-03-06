'use strict';

describe('Poller model:', function () {

    var $resource, $interval, $httpBackend, poller, resource1, resource2, poller1, poller2, result1, result2;

    beforeEach(function () {

        module('emguo.poller', 'ngResource');

        inject(function (_$resource_, _$interval_, _$httpBackend_, _poller_) {
            $resource = _$resource_;
            $interval = _$interval_;
            $httpBackend = _$httpBackend_;
            poller = _poller_;
        });

        // Basic poller
        resource1 = $resource('/users');
        $httpBackend.expect('GET', '/users').respond([
            {id: 123, name: 'Alice'},
            {id: 456, name: 'Bob'}
        ]);
        poller1 = poller.get(resource1);
        poller1.promise.then(null, null, function (data) {
            result1 = data;
        });

        // Advanced poller
        resource2 = $resource('/user');
        $httpBackend.expect('GET', '/user?id=123').respond(
            {id: 123, name: 'Alice'}
        );
        poller2 = poller.get(resource2, {
            action: 'get',
            delay: 6000,
            params: {
                id: 123
            },
            smart: true
        });
        poller2.promise.then(null, null, function (data) {
            result2 = data;
        });

        $httpBackend.flush();
    });

    afterEach(function () {
        poller.reset();
    });

    it('should have resource property.', function () {
        expect(poller1).to.have.property('resource').to.equal(resource1);
    });

    it('should have default action property - query.', function () {
        expect(poller1).to.have.property('action').to.equal('query');
    });

    it('should have customized action if it is specified.', function () {
        expect(poller2).to.have.property('action').to.equal('get');
    });

    it('should have default delay property - 5000.', function () {
        expect(poller1).to.have.property('delay').to.equal(5000);
    });

    it('should have customized delay if it is specified.', function () {
        expect(poller2).to.have.property('delay').to.equal(6000);
    });

    it('should have default params property - empty object.', function () {
        expect(poller1).to.have.property('params').to.deep.equal({});
    });

    it('should have customized params if it is specified.', function () {
        expect(poller2).to.have.property('params').to.have.property('id').to.equal(123);
    });

    it('should have default smart flag set to false.', function () {
        expect(poller1).to.have.property('smart').to.equal(false);
    });

    it('should have smart flag set to true if it is specified.', function () {
        expect(poller2).to.have.property('smart').to.equal(true);
    });

    it('should maintain a copy of resource promise.', function () {
        expect(poller1).to.have.property('promise');
    });

    it('should maintain an interval ID to manage polling.', function () {
        expect(poller1).to.have.property('interval').to.have.property('$$intervalId');
    });

    it('should stop polling and reset interval on invoking stop().', function () {
        poller1.stop();
        expect(poller1.interval).to.equal(undefined);
        expect(Number(poller1.stopTimestamp)).to.equal(Number(new Date()));
    });

    it('should ignore the response if request is sent before stop() is invoked', function () {
        $httpBackend.expect('GET', '/users').respond([
            {id: 123, name: 'Alice'}
        ]);
        $interval.flush(5500);
        poller1.stop();
        $httpBackend.flush();

        expect(result1.length).to.equal(2);
    });

    it('should restart currently running poller on invoking restart().', function () {
        var intervalId = poller1.interval.$$intervalId;
        poller1.restart();
        expect(poller1.interval.$$intervalId).to.not.equal(intervalId);
    });

    it('should start already stopped poller on invoking restart().', function () {
        poller1.stop();
        expect(poller1.interval).to.equal(undefined);
        poller1.restart();
        expect(poller1.interval).to.not.equal(undefined);
    });

    it('should have correct data in callback.', function () {
        expect(result1.length).to.equal(2);
        expect(result1[1].name).to.equal('Bob');

        expect(result2.id).to.equal(123);
        expect(result2.name).to.equal('Alice');
    });

    it('should fetch resource every (delay) milliseconds if smart flag is set to false.', function () {
        poller2.stop();
        $httpBackend.expect('GET', '/users').respond([]);
        $httpBackend.expect('GET', '/users').respond([
            {id: 123, name: 'Alice'}
        ]);
        $interval.flush(10100); // 5000 + 5000 + 100
        $httpBackend.flush();

        expect(result1.length).to.equal(1);
    });

    it('should only send new request after the previous one is resolved if smart flag is set to true', function () {
        poller1.stop();
        $httpBackend.expect('GET', '/user?id=123').respond(
            {id: 123, name: 'Alice', group: 1}
        );
        $interval.flush(12100); // 6000 + 6000 + 100
        $httpBackend.flush();

        expect(result2.group).to.equal(1);
    });
});