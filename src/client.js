'use strict';

const WPAPI = require( 'wpapi' );

// WPAPI Vagrant Varietal local env credentials
const credentials = {
  username: 'apiuser',
  password: 'password'
};

const defaultConfig = {
  // Disable bootstrapping
  routes: []
};

const create = url => {
  const client = new WPAPI( Object.assign({
    endpoint: url
  }, defaultConfig, credentials ) );

  // Add support for our custom content types
  client.albums = client.registerRoute( 'wp/v2', 'albums/(?P<id>[\\d]+)', {} );
  client.bands = client.registerRoute( 'wp/v2', 'bands/(?P<id>[\\d]+)', {} );
  client.genres = client.registerRoute( 'wp/v2', 'genres/(?P<id>[\\d]+)', {} );

  return client;
};

const discover = url => WPAPI
  .discover( url )
  .then( client => client.auth( credentials ) );

module.exports = {
  create,
  discover
};
