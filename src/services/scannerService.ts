import { type JSONRpcProvider, type Block, type ContractEvents } from 'opnet';
import { BinaryReader, type Address } from '@btc-vision/transaction';
import type { NetworkId } from '../types/network';
import { getReadProvider } from './providerService';

export interface DiscoveredApproval {
    readonly tokenAddress: string;
    readonly spenderAddress: string;
    readonly ownerAddress: string;
    readonly allowance: bigint;
    readonly blockNumber: number;
    readonly txHash: string;
}

export interface ScanCallbacks {
    readonly onApprovalFound: (approval: DiscoveredApproval) => void;
    readonly onProgress: (currentBlock: number, latestBlock: number) => void;
    readonly onComplete: (lastScannedBlock: number) => void;
    readonly onError: (error: string) => void;
}

interface DecodedApprovedEvent {
    readonly owner: Address;
    readonly spender: Address;
    readonly amount: bigint;
}

/**
 * Decode the raw binary data of an `Approved` event.
 *
 * Layout (per OP_20_ABI):
 *   owner   – ADDRESS  (32 bytes)
 *   spender – ADDRESS  (32 bytes)
 *   amount  – UINT256  (32 bytes)
 */
function decodeApprovedEvent(data: Uint8Array): DecodedApprovedEvent {
    const reader = new BinaryReader(data);
    const owner: Address = reader.readAddress();
    const spender: Address = reader.readAddress();
    const amount: bigint = reader.readU256();
    return { owner, spender, amount };
}

/** Number of blocks fetched per single RPC call via getBlocks(). */
const BATCH_SIZE = 50;

export class BlockScanner {
    #cancelled = false;
    readonly #provider: JSONRpcProvider;
    readonly #ownerHex: string;

    constructor(networkId: NetworkId, ownerAddress: string) {
        this.#provider = getReadProvider(networkId);
        this.#ownerHex = ownerAddress.toLowerCase();
    }

    async scan(startBlock: number, callbacks: ScanCallbacks): Promise<void> {
        this.#cancelled = false;

        try {
            const latestBlockBig: bigint = await this.#provider.getBlockNumber();
            const latestBlock: number = Number(latestBlockBig);

            for (
                let blockNum = startBlock;
                blockNum <= latestBlock;
                blockNum += BATCH_SIZE
            ) {
                if (this.#cancelled) break;

                const endBlock: number = Math.min(blockNum + BATCH_SIZE - 1, latestBlock);

                // Build array of block numbers for batch RPC call
                const blockTags: bigint[] = [];
                for (let b = blockNum; b <= endBlock; b++) {
                    blockTags.push(BigInt(b));
                }

                let blocks: Block[];
                try {
                    blocks = await this.#provider.getBlocks(blockTags, true);
                } catch {
                    // If batch fetch fails, skip this batch
                    callbacks.onProgress(endBlock, latestBlock);
                    continue;
                }

                for (const block of blocks) {
                    if (this.#cancelled) break;
                    this.#processBlockData(block, callbacks);
                }

                callbacks.onProgress(endBlock, latestBlock);

                // Yield to UI thread between batches
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 0);
                });
            }

            if (!this.#cancelled) {
                callbacks.onComplete(latestBlock);
            }
        } catch (err: unknown) {
            const msg: string = err instanceof Error ? err.message : String(err);
            callbacks.onError(msg);
        }
    }

    stop(): void {
        this.#cancelled = true;
    }

    #processBlockData(block: Block, callbacks: ScanCallbacks): void {
        const txs = block.transactions;
        if (!txs || txs.length === 0) return;

        const blockNumber: number = Number(block.height);

        for (const tx of txs) {
            if (this.#cancelled) return;

            const events: ContractEvents = tx.events;
            if (!events) continue;

            this.#processEvents(events, blockNumber, tx.hash, callbacks);
        }
    }

    #processEvents(
        events: ContractEvents,
        blockNumber: number,
        txHash: string,
        callbacks: ScanCallbacks,
    ): void {
        for (const [contractAddress, eventList] of Object.entries(events)) {
            if (!Array.isArray(eventList)) continue;

            for (const event of eventList) {
                if (event.type !== 'Approved') continue;

                try {
                    const decoded: DecodedApprovedEvent = decodeApprovedEvent(event.data);
                    const ownerHex: string = decoded.owner.toHex().toLowerCase();

                    if (ownerHex !== this.#ownerHex) continue;

                    callbacks.onApprovalFound({
                        tokenAddress: contractAddress,
                        spenderAddress: decoded.spender.toHex(),
                        ownerAddress: ownerHex,
                        allowance: decoded.amount,
                        blockNumber,
                        txHash,
                    });
                } catch {
                    // If decoding fails, skip this event
                }
            }
        }
    }
}
