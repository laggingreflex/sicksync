import { expect } from 'chai';
import _ from 'lodash';
import proxyquire from 'proxyquire';

import remoteHelperStub from '../stubs/remote-helper';
import wsStub from '../stubs/ws';

const { WSClient } = proxyquire('../../src/local/ws-client', {
  './remote-helper': { RemoteHelper: remoteHelperStub },
  'ws': wsStub,
});

const params = {
  secret: 'keepitsafe',
  prefersEncrypted: false,
  hostname: 'somehost',
  websocketPort: 1234,
  username: 'joel',
};

describe('ws-client', function() {
  let ws = null;

  beforeEach(function() {
    ws = new WSClient(params);
    // Emit an `on` call to indicate that remote end is ready
    remoteHelperStub._api.on.firstCall.args[1]();
  });

  afterEach(function() {
    remoteHelperStub.resetAll();
    wsStub.resetAll();
  });

  describe('connection', function() {
    it('should register callbacks via the `on` method', function() {
      expect(wsStub._api.on.called).to.be.true;
    });

    it('should register a callback for the `open` message', function() {
      expect(wsStub._api.on.getCall(0).args[0]).to.equal('open');
      expect(wsStub._api.on.getCall(0).args[1]).to.be.a('function');
    });

    it('should register a callback for the `close` message', function() {
      expect(wsStub._api.on.getCall(1).args[0]).to.equal('close');
      expect(wsStub._api.on.getCall(1).args[1]).to.be.a('function');
    });

    it('should register a callback for the `error` message', function() {
      expect(wsStub._api.on.getCall(2).args[0]).to.equal('error');
      expect(wsStub._api.on.getCall(2).args[1]).to.be.a('function');
    });
  });

  describe('#send', function() {
    it('should attach the secret to the passed in object', function() {
      ws.send({some: 'object'});

      expect(JSON.parse(wsStub._api.send.lastCall.args[0]).secret).to.not.be.a('undefined');
    });
  });

  describe('onOpen', function() {
    beforeEach(function() {
      // Trigger `open`
      wsStub._api.on.getCall(0).args[1]();
    });

    it('should emit a `ready` event', function(done) {
      ws.on('ready', done);
      wsStub._api.on.getCall(0).args[1]();
    });
  });

  describe('onError', function() {
    beforeEach(function() {
      // Trigger `error`
      wsStub._api.on.getCall(2).args[1]();
    });

    it('should emit an `reconnecting` event', function(done) {
      ws.on('reconnecting', done);

      // Trigger `error`
      wsStub._api.on.getCall(2).args[1]();
    });

    it('should start the remote devbox', function() {
      expect(remoteHelperStub._api.start.called).to.be.true;
    });

    it('should listen for the `ready` message from the devbox', function() {
      expect(remoteHelperStub._api.on.getCall(0).args[0]).to.equal('ready');
      expect(remoteHelperStub._api.on.getCall(0).args[1]).to.be.a('function');
    });

    it('should listen for the `message` message from the devbox', function() {
      expect(remoteHelperStub._api.on.getCall(1).args[0]).to.equal('message');
      expect(remoteHelperStub._api.on.getCall(1).args[1]).to.be.a('function');
    });

    it('should listen for the `not-found` message from the devbox', function() {
      expect(remoteHelperStub._api.on.getCall(2).args[0]).to.equal('not-found');
      expect(remoteHelperStub._api.on.getCall(2).args[1]).to.be.a('function');
    });
  });
});
