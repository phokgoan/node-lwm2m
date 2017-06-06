#!/usr/bin/env node

const lwm2m = require('../');
const async = require('async');
const apply = async.apply;
const fs = require('fs');
const debug = require('debug')('lwm2m:bootstrap');
const crypto = require('crypto');

const bootstrap = lwm2m.bootstrap;

var options = {
  udpWindow: 1,
  ipProtocol: 'udp6',
  serverProtocol: 'udp6',
  schemas: {
    '/0': lwm2m.Schema(require('../oma/security.json')),
    '/1': lwm2m.Schema(require('../oma/server.json')),
    '/2': lwm2m.Schema(require('../oma/acl.json'))
  }
};

const server = bootstrap.createServer(options)
  .on('error', (err) => {
    throw err;
  })
  .on('close', () => {
    console.log('server finished');
  })
  .on('bootstrapRequest', (device, cb) => {
    setImmediate(provisionDevice, device);
    cb();
  });

server.listen(3001);

const write = server.write;
const remove = server.remove;
const finish = server.finish;

function provisionDevice(device) {
  // configure bootstrap information

  // note this may block for a while,
  // if there is not enough entropy
  // const psk = crypto.randomBytes(16);

  const securityObject = {
    uri: 'coaps://localhost:3002',
    bootstrap: false,
    serverId: 1,
    mode: 0,
    clientCert: Buffer.from('foo', 'utf8'),
    secretKey: Buffer.from('abcd', 'hex')
  };

  const serverObject = {
    serverId: 1,
    lifetime: 300,
    notifStoring: false,
    binding: 'U'
  };

  const aclObject = {
    owner: 1,
    objectId: 3,
    instanceId: 101,
    acl: [0x000f, 0x000f]
  };

  const options = {
    format: 'application/vnd.oma.lwm2m+tlv'
  };

  const options2 = {
    format: 'application/vnd.oma.lwm2m+json'
  };

  debug('Provisioning device `' + device.ep + '`');

  async.series([
    remove.bind(server, device, '/0'),
    remove.bind(server, device, '/1'),
    remove.bind(server, device, '/2'),
    write.bind(server, device, '/0/1', securityObject, options),
    write.bind(server, device, '/1/1', serverObject, options2),
    write.bind(server, device, '/2/1', aclObject, options2),
    finish.bind(server, device)
  ], function(err) {
    if (err) throw(err);
  });
}

