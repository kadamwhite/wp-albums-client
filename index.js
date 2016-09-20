/* eslint no-unused-vars: 1 */
'use strict';

const path = require( 'path' );
const site = require( './src/client' ).create( 'http://wpapi.loc/wp-json' );

// Get the data to load
const data = {
  albums: require( './data/albums.json' ),
  bands: require( './data/bands.json' ),
  genres: require( './data/genres.json' )
};

const getIDsByName = collection => collection
  .reduce( ( dictionary, item ) => Object.assign({
    [item.name]: item.id
  }, dictionary ), {});

/**
 * Bootstrap the content for a particular collection based on data JSON:
 * if there is no data in the collection, add each item, otherwise return
 * the first page of the collection
 *
 * @param {string} taxBase The rest base for the resource, e.g. "bands"
 * @returns {Promise} A promise resolving to a populated collection
 */
const getOrCreateTaxonomy = taxBase => site[taxBase]()
  .then( collection => {
    if ( collection.length ) {
      return collection;
    }
    return data[taxBase]
      .reduce(
        ( lastItemCreated, term ) => lastItemCreated
          .then( () => site[taxBase]().create({
            name: term.name,
            description: term.description
          }) ),
        Promise.resolve()
      )
      .then( () => site[taxBase]() )
      .then( collection => {
        const idByName = getIDsByName( collection );

        return data[taxBase]
          .reduce( ( lastStep, term ) => {
            if ( !term.parent ) {
              return lastStep;
            }
            return lastStep.then( () => site[taxBase]()
              .id( idByName[term.name] )
              .update({
                parent: idByName[term.parent]
              }) );
          }, Promise.resolve() );
      });
  })
  .then( () => site[taxBase]() );

const emptyCollection = resource => site[resource]()
  .then( collection => {
    return collection.reduce(
      ( lastItemDeleted, term ) => lastItemDeleted
        .then( () => site[resource]()
          .id( term.id )
          .delete({
            force: true
          })
        ),
      Promise.resolve()
    );
  });

const promiseHash = hash => {
  const keys = Object.keys( hash ).sort();
  const promises = keys.map( key => hash[key] );

  return Promise.all( promises )
    .then( resultArr => resultArr.reduce(
      ( resultObj, result, idx ) => Object.assign({
        [keys[idx]]: result
      }, resultObj ),
      {}
    ) );
};

const createAlbum = ( album, taxonomies ) => {
  const bandIDsByName = getIDsByName( taxonomies.bands );
  const genreIDsByName = getIDsByName( taxonomies.genres );

  return site.albums()
    .create({
      title: album.title,
      content: album.content,
      date: album.date,
      status: 'publish',
      genres: album.genres.map( name => genreIDsByName[name] ),
      bands: album.bands.map( name => bandIDsByName[name] )
    })
    .then( result => {
      const albumId = result.id;

      return site.media()
        .file( path.join( __dirname, 'data', album.cover.file ) )
        .create({
          parent: albumId,
          alt: album.cover.alt
        })
        .then( uploadedMedia => {
          const mediaId = uploadedMedia.id;

          return site.albums()
            .id( albumId )
            .update({
              featured_media: mediaId // eslint-disable-line camelcase
            });
        });
    });
};

Promise.all( [
  // emptyCollection( 'bands' ),
  // emptyCollection( 'genres' ),
  emptyCollection( 'albums' ),
  emptyCollection( 'media' )
] )
  .then( () => promiseHash({
    bands: getOrCreateTaxonomy( 'bands' ),
    genres: getOrCreateTaxonomy( 'genres' )
  }) )
  .then( taxonomies => Promise.all(
    data.albums.map( album => createAlbum( album, taxonomies ) )
  ) )
  .then( album => console.log( album ) )
  .catch( err => console.error( err ) );
