#!/usr/bin/env node

import c from 'chalk';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { keccak256 } from 'ethers';
import * as fs from 'fs';
import path from 'path';
import { Provider } from './.provider.js';
import ProgressBar from 'progress';

import { mkdir, writeFile } from 'fs/promises';

// await Promise.all(txs
//     .filter(tx => tx.contractAddress)
//     .map(async tx => {
//         const content = await provider.getCode(tx.contractAddress);
//         const hash = keccak256(content);
//         const prefix = hash.slice(2, 4);

//         await Promise.all([
//             writeFile(path.join(`.${name}`, prefix, hash + '.bytecode'), content, 'utf8'),
//             db.run('INSERT INTO contracts (address, tx, hash, size) VALUES ($address, $tx, $hash, $size)', {
//                 $address: tx.contractAddress,
//                 $tx: tx.transactionHash,
//                 $hash: hash,
//                 $size: content.length,
//             })
//         ]);
//     })
// );

async function fetchCode(address, name) {
    const path = `.${name}/${address}.bytecode`;
    fs.readFileSync(path, 'utf8');
    const code = await provider.getCode(address);
}

async function main() {
    const info = (message, ...optionalParams) => console.info(c.dim('[info]'), message, ...optionalParams);

    const provider = new Provider();
    info('Connecting to', c.blue(provider.url), '...', await provider.chainId());

    const name = 'sepolia';
    const dbname = `${name}.sqlite`;
    info('Opening db', c.blue(dbname));
    const db = await open({
        filename: dbname,
        driver: sqlite3.Database
    });

    // await db.exec('CREATE TABLE IF NOT EXISTS contracts (address TEXT PRIMARY KEY ON CONFLICT REPLACE, hash TEXT NOT NULL) STRICT');
    await db.exec('CREATE TABLE IF NOT EXISTS contracts (address TEXT PRIMARY KEY ON CONFLICT REPLACE, tx TEXT NOT NULL, hash TEXT NOT NULL, size INTEGER NOT NULL) STRICT');

    // const contracts = JSON.parse(fs.readFileSync('./contract-addresses.json', 'utf8'));


    const rows = await db.all('SELECT number, addresses FROM blocks WHERE addresses != "" AND seen IS NULL');
    const bar = new ProgressBar(':bar :percent :current/:total', { total: rows.length });
    for (const { number, addresses } of rows) {
        bar.tick();

        for (const pair of addresses.split(',')) {
            const [txhash, address] = pair.split(':');
            const content = await provider.getCode(address);
            const hash = keccak256(content);
            const prefix = hash.slice(2, 4);

            await Promise.all([
                writeFile(path.join(`.${name}`, prefix, hash + '.bytecode'), content, 'utf8'),
                db.run('INSERT INTO contracts (address, tx, hash, size) VALUES ($address, $tx, $hash, $size)', {
                    $address: address,
                    $tx: txhash,
                    $hash: hash,
                    $size: content.length,
                })
            ]);
        }

        await db.run('UPDATE blocks SET seen = 1 WHERE number = ?', number);
    }
    return;

    for (const { address } of contracts) {
        bar.tick();

        const row = await db.get('SELECT hash FROM contracts WHERE address = :address', {
            ':address': address,
        });
        if (row !== undefined) {
        } else {
            const content = await provider.getCode(address);
            const hash = keccak256(content);

            fs.writeFile(path.join(`${name}`, hash + '.bytecode'), content, 'utf8', err => {
                if (err) {
                    console.error(err);
                    throw err;
                }
            });

            void db.run('INSERT INTO contracts (address, hash) VALUES (:address, :hash)', {
                ':address': address,
                ':hash': hash,
            });
        }
    }
}

main().catch(console.error);
