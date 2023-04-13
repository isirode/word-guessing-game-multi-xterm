import Peer from 'peerjs';
import * as PeerJS from 'peerjs';
import { Config } from './config/Config';

export function createPeer(config: Config): Peer {
  const peer = new Peer({
    host: config.peerServerHostname,
    port: config.peerServerPort
  });
  
  peer.on('connection', (connection: PeerJS.DataConnection) => {
    console.log('connection')
    console.log(connection)
    connection.on('data', (data) => {
      console.log('data');
      console.log(connection);
      console.log(data);
    });
    connection.on('open', () => {
      console.log('open received');
      console.log(connection);
    });
    connection.on('close', function () {
      console.log('connection closed');
    });
  });
  peer.on('disconnected', function () {
    console.log('disconnected')
  });
  peer.on('close', function () {
    console.log('close')
  });
  peer.on('error', function (err) {
    console.error('error');
    console.error(err);
  });

  return peer;
}

