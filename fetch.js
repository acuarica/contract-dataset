#!/usr/bin/env node

import c from 'chalk';
import { Provider } from './.provider.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import ProgressBar from 'progress';
import { keccak256 } from 'ethers';
import { mkdir, writeFile } from 'fs/promises';

const name = 'sepolia';

const info = (message, ...optionalParams) => console.info(c.dim('[info]'), message, ...optionalParams);

/**
 * 
 * @param {Provider} provider 
 * @param {sqlite3.Database} db 
 * @param {number} blockNumber 
 * @param {string} txHash 
 * @param {string} address 
 */
async function fetchCode(provider, db, blockNumber, txHash, address) {
    const content = await provider.getCode(address);
    const hash = keccak256(content);

    await Promise.all([
        writeFile(path.join(`.${name}`, hash.slice(2, 4), hash + '.bytecode'), content, 'utf8'),
        db.run('INSERT INTO contracts (address, txhash, number, hash, size) VALUES ($address, $txhash, $number, $hash, $size)', {
            $address: address,
            $txhash: txHash,
            $number: blockNumber,
            $hash: hash,
            $size: content.length,
        })
    ]);
}

async function main() {
    const dbname = `${name}.sqlite`;
    const provider = new Provider();

    info('Provider', c.cyan(provider.url), 'using', c.magenta(await provider.clientVersion()));

    const latestBlock = await provider.blockNumber();

    info('Network', c.blue(name), `(${c.yellow(await provider.chainId())})`, 'at block \uD83D\uDCE6', c.green(latestBlock));

    info('Opening db', c.magenta(dbname));
    const db = await open({
        filename: dbname,
        driver: sqlite3.Database
    });

    await db.exec('CREATE TABLE IF NOT EXISTS blocks (number INTEGER PRIMARY KEY ON CONFLICT REPLACE, txs INTEGER NOT NULL, addresses TEXT NOT NULL, seen INTEGER) STRICT');
    await db.exec('CREATE TABLE IF NOT EXISTS contracts (address TEXT PRIMARY KEY ON CONFLICT REPLACE, txhash TEXT NOT NULL, number INTEGER NOT NULL, hash TEXT NOT NULL, size INTEGER NOT NULL) STRICT');

    info(`Creating directory prefixes under ${c.magenta('.' + name)}`);
    for (let i = 0; i < 256; i++) {
        const prefix = i.toString(16).padStart(2, '0');
        await mkdir(path.join(`.${name}`, prefix), { recursive: true });
    }

    const row = await db.get('SELECT MAX(number) AS number FROM blocks');
    const startBlock = row.number ? row.number + 1 : 0;
    info('Fetching from block \uD83D\uDCE6', c.green(startBlock), 'to \uD83D\uDCE6', c.green(latestBlock) + '...');

    const bar = new ProgressBar(':bar :percent :current/:total', { total: latestBlock - startBlock + 1 });

    for (let blockNumber = startBlock; blockNumber <= latestBlock; blockNumber++) {
        bar.tick();

        /** @type {{transactionHash: string, contractAddress?: string}[]} */
        const txs = await provider.getBlockReceipts(blockNumber);
        const addresses = [];
        for (const tx of txs) {
            if (tx.contractAddress) {
                addresses.push(`${tx.transactionHash}:${tx.contractAddress}`);
                await fetchCode(provider, db, blockNumber, tx.transactionHash, tx.contractAddress);
            }
        }

        await db.run('INSERT INTO blocks(number, txs, addresses) VALUES ($number, $txs, $addresses)', {
            $number: blockNumber,
            $txs: txs.length,
            $addresses: addresses.join(','),
        });
    }
}

main().catch(console.error);
