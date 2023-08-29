#!/usr/bin/env node

import c from 'chalk';
import { ethers } from 'ethers';
import * as fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const shortaddr = addr => `${addr.slice(0, 6)}..${addr.slice(-4)}`;

async function fetchCode(provider, address, name) {
	const path = `.${name}/${address}.bytecode`;
	const code = await provider.getCode(address);
	fs.writeFileSync(path, code, 'utf8');
}

async function txs(provider, blockNumber, name, db) {
	const info = (address, txHash) => console.info(c.magenta(shortaddr(address)), txHash);

	const path = `.${name}/${blockNumber}.json`;

	process.stdout.write(`${c.dim('[info]')} Block ${c.cyan(blockNumber)}`);
	try {
		const contracts = JSON.parse(fs.readFileSync(path, 'utf8'));
		contracts.forEach(({ address, txHash }) => info(address, c.dim(txHash)));
		console.info();
		await db.run('INSERT INTO blocks(number, contracts) VALUES (:number, :contracts)', {
			':number': blockNumber,
			':contracts': contracts.length,
		});
	
	} catch (err) {
		const block = await provider.getBlock(blockNumber);
		console.info(` (${block.transactions.length} transactions)`);
		const contracts = [];
		for (const txHash of block.transactions) {
			const tx = await provider.getTransaction(txHash);
			const receipt = await provider.getTransactionReceipt(txHash);
			if (!tx.to && receipt.contractAddress) {
				const address = receipt.contractAddress;
				info(address, txHash);
				await fetchCode(provider, address, name);
				contracts.push({ address, txHash });
			}
		}

		await db.run('INSERT INTO blocks(number, contracts) VALUES (:number, :contracts)', {
			':number': blockNumber,
			':contracts': contracts.length,
		});
		fs.writeFile(path, JSON.stringify(contracts, null, 2), 'utf8', err => {
			if (err) throw err;
		});
	}
}

async function main() {
	const info = (message, ...optionalParams) => console.info(c.dim('[info]'), message, ...optionalParams);

    const db = await open({
        filename: 'blocks.sqlite',
        driver: sqlite3.Database
    });
    await db.exec('CREATE TABLE IF NOT EXISTS blocks (number INTEGER PRIMARY KEY ON CONFLICT REPLACE, contracts INTEGER NOT NULL) STRICT');

	const url = 'http://127.0.0.1:8545';
	info('Connecting to', c.blue(url), '...');

	const provider = new ethers.JsonRpcProvider(url);
	const network = await provider.getNetwork();
	const latestBlock = await provider.getBlockNumber()

	info('Network', c.blue(network.name), `(${c.yellow(network.chainId)})`, 'at block', c.green(latestBlock));

	// 2657991

	for (let blockNumber = 1735371; blockNumber <= latestBlock; blockNumber++) {
		await txs(provider, blockNumber, network.name, db);
	}
}

main().catch(console.error);
