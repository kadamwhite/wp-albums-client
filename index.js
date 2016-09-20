'use strict';

const wp = require( './src/client' );

const site = wp.create( 'http://wpapi.loc/wp-json' );

// Get the data to load
const data = {
  bands: require( './data/bands.json' ),
  genres: require( './data/genres.json' )
};

// site.albums().then( albums => console.log( albums ) );

/**
 * Bootstrap the content for a particular collection based on data JSON:
 * if there is no data in the collection, add each item, otherwise return
 * the first page of the collection
 *
 * @param {string} resource The rest base for the resource, e.g. "bands"
 * @returns {Promise} A promise resolving to a populated collection
 */
const getOrCreateTaxonomy = taxBase => site[ taxBase ]()
  .then( collection => {
    if ( collection.length ) {
      return collection;
    }
    return data[ taxBase ]
      .reduce(
        ( lastItemCreated, term ) => lastItemCreated
          .then( () => site[ taxBase ]().create({
            name: term.name,
            description: term.description
          }) ),
        Promise.resolve()
      )
      .then( () => site[ taxBase ]().perPage( data[ taxBase ].length ) );
  })
  .then( collection => {
    const idByName = collection.reduce( ( dictionary, item ) => {
      return Object.assign({
        [ item.name ]: item.id
      }, dictionary );
    }, {} );
    return data[ taxBase ]
      .reduce( ( lastStep, term ) => {
        if ( ! term.parent ) {
          return lastStep;
        }
        return lastStep.then( () => site[ taxBase ]()
          .id( idByName[ term.name ] )
          .update({
            parent: idByName[ term.parent ]
          }) );
      }, Promise.resolve() );
  })
  .then( () => site[ taxBase ]().perPage( data[ taxBase ].length ) );

const emptyTaxonomy = taxBase => site[ taxBase ]()
  .then( collection => {
    return collection.reduce(
      ( lastItemDeleted, term ) => lastItemDeleted
        .then( () => site[ taxBase ]().id( term.id ).delete({
          force: true
        }) ),
      Promise.resolve()
    )
  });

getOrCreateTaxonomy( 'bands' ).then( bands => console.log( bands ) );
emptyTaxonomy( 'genres' )
  .then( () => getOrCreateTaxonomy( 'genres' ) )
  .then( genres => console.log( genres ) )
  .catch( err => console.error( err ) );

// site.albums().create({

// })
