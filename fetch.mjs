#!/usr/bin/env node

import { Provider } from './provider.mjs';
import * as path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// https://gist.github.com/leommoore/4526808
// https://en.wikipedia.org/wiki/ANSI_escape_code
const dim = text => `\x1b[2m${text}\x1b[0m`;
const blue = text => `\x1b[34m${text}\x1b[0m`;
const magenta = text => `\x1b[35m${text}\x1b[0m`;
const cyan = text => `\x1b[36m${text}\x1b[0m`;

const info = (message, ...optionalParams) => console.info(dim('[info]'), message, ...optionalParams);

const apiKey = readFileSync('./.ALCHEMY_KEY', 'utf-8');

const provider = new class {
    providers = [
        new Provider(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`),
        new Provider('https://mainnet.infura.io/v3/84842078b09946638c03157f83405213'),
        new Provider('https://cloudflare-eth.com/'),
    ];
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

    const network = 'mainnet';

    mkdirSync(network, { recursive: true });
    info('Network', blue(network), `(${magenta(await provider._.chainId())})`, 'at block \uD83D\uDCE6', await provider._.blockNumber());

    for (const [address, name] of contracts) {
        const filePath = path.join(network, `${name}-${address}.bytecode`);
        if (existsSync(filePath)) {
            info(dim(`Contract cached ${cyan(name)} ${magenta(address)}`));
        } else {
            info(`Fetching contract ${cyan(name)} ${magenta(address)}`);
            const content = await provider._.getCode(address);
            writeFileSync(filePath, content, 'utf8');
        }
    }
}

main().catch(console.error);
