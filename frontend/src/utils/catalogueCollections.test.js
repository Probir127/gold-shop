import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueCollections } from './catalogueCollections.js';
test('homepage uses admin names, slugs and matching product photographs', () => {
  const result = catalogueCollections([{id:7,name:'Wedding chains',slug:'wedding-chains'}], [
    {category:8,image:'/wrong.jpg'}, {category:7,image:'/chain.jpg',name:'Gold chain',in_stock:true},
  ]);
  assert.deepEqual(result[0], {id:7,name:'Wedding chains',slug:'wedding-chains',image:'/chain.jpg',imageAlt:'Gold chain',count:1});
  assert.equal(catalogueCollections([{id:9,name:'Rings',slug:'rings'}],[])[0].image,null);
  assert.deepEqual(catalogueCollections([],[]),[]);
});
