# Contracts Dataset

Provides a dataset of smart contract bytecodes and their ABIs.

## Contract Addresses Index

The Contract addresses index needs to be manually downloaded from
<https://etherscan.io/exportData?type=open-source-contract-codes>.
Afterwards, the index needs to be _clean up_ by removing the first-line `Note:`,
column titles and the `"Txhash"` column.

## Fetch Smart Contract Bytecodes

To fetch Smart Contract bytecodes, you can use the `fetch.js` script

```console
./fetch.js
```
