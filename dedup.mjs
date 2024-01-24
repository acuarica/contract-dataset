#!/usr/bin/env node

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

function main() {
    /** @type {[string, string][]} */
    const contracts = readFileSync('./export-verified-contractaddress-opensource-license.csv', 'utf8')
        .trimEnd()
        .split('\n')
        .map(entry => entry.trimEnd().replace(/"/g, '').split(','))

    console.info(contracts.length, 'contract bytecodes');

    /** @type {Map<string, string[]>} */
    const map = new Map();
    const empty = [];

    const chainId = '1';
    for (const [address, name] of contracts) {
        const key = `${name}-${address}`;
        const filePath = path.join(chainId, `${key}.bytecode`);
        const file = readFileSync(filePath, 'utf-8');
        const hash = createHash('sha256').update(file).digest('hex');

        let addrs = map.get(hash);
        if (addrs === undefined) {
            addrs = [];
            map.set(hash, addrs);
        }
        addrs.push(key);

        if (file.length === 2) empty.push(key)
    }

    console.info(map.size, 'distinct contract bytecodes');

    [...map.values()]
        .filter(addrs => addrs.length > 1)
        .map(addrs => `(${addrs.length - 1}) ${addrs.join('|')}`)
        .forEach(addrs => console.info(`* ${addrs}`));

    console.info();
    console.info('Empty contracts', `(${empty.length})`, empty.join('|'));
}

main();
