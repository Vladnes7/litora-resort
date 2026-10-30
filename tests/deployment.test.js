import test from 'node:test';
import assert from 'node:assert/strict';
import {localPath,sitePath,normalizeBasePath} from '../src/deployment.js';
test('root and project hosting preserve the same internal route',()=>{
 assert.equal(localPath('/rooms/sea-deluxe/'),'/rooms/sea-deluxe');
 assert.equal(localPath('/litora-resort/rooms/sea-deluxe/','/litora-resort'),'/rooms/sea-deluxe');
 assert.equal(localPath('/litora-resort/','/litora-resort'),'/');
});
test('deployment prefix is applied once and only on a path boundary',()=>{
 assert.equal(sitePath('/rooms','/litora-resort'),'/litora-resort/rooms');
 assert.equal(sitePath('/litora-resort/rooms','/litora-resort'),'/litora-resort/rooms');
 assert.equal(localPath('/litora-resort-other/rooms','/litora-resort'),'/litora-resort-other/rooms');
});
test('deployment prefixes cannot escape the project or contain markup',()=>{
 assert.equal(normalizeBasePath('/litora-resort/'),'/litora-resort');assert.equal(normalizeBasePath('/'),'');
 for(const bad of ['../escape','/../escape','/site/../other','/site"><script>'])assert.throws(()=>normalizeBasePath(bad));
});
