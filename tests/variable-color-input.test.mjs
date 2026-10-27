import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVariableHex} from '../web/variable-manager.js';
test('variable hex input accepts hashless, mixed-case and shorthand colors',()=>{
 for(const [input,expected] of [['3366FF','#3366ff'],[' #AbC ','#aabbcc'],['fff','#ffffff'],['#123456','#123456']])
  assert.equal(normalizeVariableHex(input),expected);
});
test('incomplete or invalid variable colors are rejected before saving',()=>{
 for(const input of ['', '#', '12', '12345', '12345678', 'gggggg', 'red'])
  assert.throws(()=>normalizeVariableHex(input),/hex color/);
});
