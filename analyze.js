#!/usr/bin/env node

import c from 'chalk';
import * as fs from 'fs';
import { Contract, STEP } from 'sevm';

function analyze(code, path) {
    const step = STEP();
    const PC = state => {
        step['PC'](state);
        console.log('PC', path);
    };
    const STATICCALL = state => {
        step['STATICCALL'](state);
        console.log('STATICCALL', path);
    };
    try {
        const contract = new Contract(code, { PC });
    } catch (err) {
        console.info(path, err);
    }
}

function main() {
    let prefixes = process.argv.slice(2);
    prefixes = prefixes.length === 0 ? fs.readdirSync('.sepolia') : prefixes;

    for (const prefix of prefixes) {
        process.stdout.write(`${c.dim(prefix)} `);
        for (const file of fs.readdirSync(`.sepolia/${prefix}`)) {
            const path = `.sepolia/${prefix}/${file}`;
            console.info(`Running ${c.cyan('sevm')} analysis on ${c.magenta(file.slice(0, 8) + '..' + file.slice(-9-6))}`);
            const code = fs.readFileSync(path, 'utf8');
            analyze(code, path);
        }
    }
}

main();
