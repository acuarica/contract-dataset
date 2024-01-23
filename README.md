# Contracts Dataset

## Set up local node

With Erigon

<https://github.com/ledgerwatch/erigon>

```console
./erigon --prune h --prune r --prune t --prune c --chain=sepolia --internalcl --http.api=eth,erigon,engine,net,web3
```

From Erigon `--help`

```console
./erigon --help
[...]
    --prune value           Choose which ancient data delete from DB:
                            h - prune history (ChangeSets, HistoryIndices - used by historical state access, like eth_getStorageAt, eth_getBalanceAt, debug_traceTransaction, trace_block, trace_transaction, etc.)
                            r - prune receipts (Receipts, Logs, LogTopicIndex, LogAddressIndex - used by eth_getLogs and similar RPC methods)
                            t - prune transaction by it's hash index
                            c - prune call traces (used by trace_filter method)
                            Does delete data older than 90K blocks, --prune=h is shortcut for: --prune.h.older=90000.
                            Similarly, --prune=t is shortcut for: --prune.t.older=90000 and --prune=c is shortcut for: --prune.c.older=90000.
                            However, --prune=r means to prune receipts before the Beacon Chain genesis (Consensus Layer might need receipts after that).
                            If an item is NOT on the list - means NO pruning for this data.
                            Example: --prune=htc (default: "disabled")
[...]
```
