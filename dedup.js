#!/usr/bin/env node

import { keccak256 } from 'ethers';
import * as fs from 'fs';
import path from 'path';
import ProgressBar from 'progress';

async function fetchCode(address, name) {
    const path = `.${name}/${address}.bytecode`;
    fs.readFileSync(path, 'utf8');
}

function main() {
    const name = process.argv[2];

    const hashes = new Map();

    const files = fs.readdirSync('.' + name);

    const bar = new ProgressBar(':bar :percent :current/:total', { total: files.length });

    for (const file of files) {
        bar.tick();
        if (file.endsWith('.bytecode')) {
            const content = fs.readFileSync(path.join(`.${name}`, file), 'utf8');
            const hash = keccak256(content);

            let x = hashes.get(hash);
            if (x === undefined) {
                x = [];
                hashes.set(hash, x);
            }
            x.push(file);
        }
    }

    hashes.forEach((v, k) => {
        if (v.length > 1) console.info(k, v);
    });
}

main();
