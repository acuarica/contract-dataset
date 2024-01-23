#!/usr/bin/env node --env-file=.env

import { Provider } from './provider.mjs';
import * as path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// https://gist.github.com/leommoore/4526808
// https://en.wikipedia.org/wiki/ANSI_escape_code
const dim = text => `\x1b[2m${text}\x1b[0m`;
const green = text => `\x1b[32m${text}\x1b[0m`;
const yellow = text => `\x1b[33m${text}\x1b[0m`;
const blue = text => `\x1b[34m${text}\x1b[0m`;
const magenta = text => `\x1b[35m${text}\x1b[0m`;
const cyan = text => `\x1b[36m${text}\x1b[0m`;

const info = (message, ...optionalParams) => console.info(dim('[info]'), message, ...optionalParams);

const {
    ALCHEMY_KEY = null,
    INFURA_KEY = '84842078b09946638c03157f83405213',
} = process.env;

const provider = new class {
    providers = [
        new Provider('https://cloudflare-eth.com/'),
        ALCHEMY_KEY === null ? null : new Provider(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`),
        new Provider(`https://mainnet.infura.io/v3/${INFURA_KEY}`),
    ].filter(p => p !== null);

    current = 0;

    get _() {
        this.current = (this.current + 1) % this.providers.length;
        return this.providers[this.current];
    }
}();

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
        const filePath = path.join(chainId, `${name}-${address}.bytecode`);
        process.stdout.write(`Fetching contract #${index++} ${cyan(name)} ${magenta(address)}`);
        if (existsSync(filePath)) {
            console.info(green(' \u2713'));
        } else {
            console.info(yellow(' \u2913'));
            const content = await provider._.getCode(address);
            writeFileSync(filePath, content, 'utf8');
        }
    }
}

main().catch(console.error);
