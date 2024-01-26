#!/usr/bin/env node --env-file=.env

import { Provider } from './provider.mjs';
import * as path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// https://gist.github.com/leommoore/4526808
// https://en.wikipedia.org/wiki/ANSI_escape_code
const dim = text => `\x1b[2m${text}\x1b[0m`;
const red = text => `\x1b[31m${text}\x1b[0m`;
const green = text => `\x1b[32m${text}\x1b[0m`;
const yellow = text => `\x1b[33m${text}\x1b[0m`;
const blue = text => `\x1b[34m${text}\x1b[0m`;
const magenta = text => `\x1b[35m${text}\x1b[0m`;
const cyan = text => `\x1b[36m${text}\x1b[0m`;

const info = (message, ...optionalParams) => console.info(dim('[info]'), message, ...optionalParams);

const {
    ALCHEMY_KEY,
    // Public shared key
    INFURA_KEY = '84842078b09946638c03157f83405213',
    // Public shared key
    ETHERSCAN_KEY,
} = process.env;

const provider = new class {
    providers = [
        new Provider('https://cloudflare-eth.com/'),
        ALCHEMY_KEY ? new Provider(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`) : undefined,
        new Provider(`https://mainnet.infura.io/v3/${INFURA_KEY}`),
    ].filter(p => p !== undefined);

    current = 0;

    get _() {
        this.current = (this.current + 1) % this.providers.length;
        return this.providers[this.current];
    }
}();

/**
 * @param {string} address
 * @returns {Promise<string | undefined>}
 */
async function getabi(address) {
    /**
     * @param {number} ms
     * @returns {Promise<void>}
     */
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    await sleep(250);
    const apiKey = ETHERSCAN_KEY ? `&apikey=${ETHERSCAN_KEY}` : '';
    const resp = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${address}${apiKey}`)
    if (!resp.ok) return undefined;

    const json = await resp.json();
    if (json.status !== '1') return undefined;

    const result = JSON.stringify(JSON.parse(json.result), null, 2);
    return result;
}

async function main() {
    /** @type {[string, string][]} */
    const contracts = readFileSync('./export-verified-contractaddress-opensource-license.csv', 'utf8')
        .trimEnd()
        .split('\n')
        .map(entry => entry.trimEnd().replace(/"/g, '').split(','))
    info(contracts.length, 'contracts');

    info(`Using ${provider.providers.length} backend providers`);
    for (const backend of provider.providers) {
        info(`  backend ${blue(await backend.clientVersion())}`);
    }

    const chainId = (await provider._.chainId()).toString();

    info(`Chain ID ${blue(chainId)} at block \uD83D\uDCE6 ${await provider._.blockNumber()}`);

    mkdirSync(chainId, { recursive: true });

    let index = 1;
    for (const [address, name] of contracts) {
        process.stdout.write(`Contract ${dim(`#${index++}`)} ${cyan(name)} ${magenta(address)}`);

        const basePath = path.join(chainId, `${name}-${address}`);
        const filePath = `${basePath}.bytecode`;
        process.stdout.write(' </>');
        if (existsSync(filePath)) {
            process.stdout.write(green('\u2713'));
        } else {
            const content = await provider._.getCode(address);
            writeFileSync(filePath, content, 'utf8');
            process.stdout.write(yellow('\u2913'));
        }

        const abiPath = `${basePath}.abi.json`;
        process.stdout.write(' {}');
        if (existsSync(abiPath)) {
            process.stdout.write(green('\u2713'));
        } else {
            const content = await getabi(address);
            if (content !== undefined) {
                writeFileSync(abiPath, content, 'utf8');
                process.stdout.write(yellow('\u2913'));
            } else {
                process.stdout.write(red('\u2717'));
            }
        }

        console.info();
    }
}

main().catch(console.error);
