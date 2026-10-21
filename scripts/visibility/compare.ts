import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { compare, type Report } from './core';

const { values } = parseArgs({ options: { baseline: { type: 'string' }, current: { type: 'string' }, out: { type: 'string' } } });
if (!values.baseline || !values.current) throw Error('Usage: visibility:compare --baseline accepted.json --current report.json [--out delta.json]');
const load = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Report;
const delta = compare(load(values.baseline), load(values.current));
const json = JSON.stringify(delta, null, 2);
if (values.out) writeFileSync(values.out, json);
console.log(json);
