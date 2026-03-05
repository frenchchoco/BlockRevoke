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
    onApprovalFound: (approval: DiscoveredApproval) => void;
    onProgress: (currentBlock: number, latestBlock: number) => void;
    onComplete: (lastScannedBlock: number) => void;
    onError: (error: string) => void;
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
    const owner = reader.readAddress();
    const spender = reader.readAddress();
    const amount = reader.readU256();
    return { owner, spender, amount };
}

const BATCH_SIZE = 5;

export class BlockScanner {
    private cancelled = false;
    private readonly provider: JSONRpcProvider;
    private readonly ownerHex: string;

    constructor(networkId: NetworkId, ownerAddress: string) {
        this.provider = getReadProvider(networkId);
        this.ownerHex = ownerAddress.toLowerCase();
    }

    async scan(startBlock: number, callbacks: ScanCallbacks): Promise<void> {
        this.cancelled = false;

        try {
            const latestBlockBig: bigint = await this.provider.getBlockNumber();
            const latestBlock = Number(latestBlockBig);

            for (
                let blockNum = startBlock;
                blockNum <= latestBlock;
                blockNum += BATCH_SIZE
            ) {
                if (this.cancelled) break;

                const endBlock = Math.min(blockNum + BATCH_SIZE - 1, latestBlock);

                for (let b = blockNum; b <= endBlock; b++) {
                    if (this.cancelled) break;
                    await this.processBlock(b, callbacks);
                }

                callbacks.onProgress(endBlock, latestBlock);

                // Yield to UI thread between batches
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 0);
                });
            }

            if (!this.cancelled) {
                callbacks.onComplete(latestBlock);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            callbacks.onError(msg);
        }
    }

    stop(): void {
        this.cancelled = true;
    }

    private async processBlock(
        blockNumber: number,
        callbacks: ScanCallbacks,
    ): Promise<void> {
        let block: Block;
        try {
            block = await this.provider.getBlock(BigInt(blockNumber), true);
        } catch {
            // Skip blocks we cannot fetch
            return;
        }

        const txs = block.transactions;
        if (!txs || txs.length === 0) return;

        for (const tx of txs) {
            if (this.cancelled) return;

            // TransactionBase extends TransactionReceipt, so events are already present
            const events: ContractEvents = tx.events;
            if (!events) continue;

            this.processEvents(events, blockNumber, tx.hash, callbacks);
        }
    }

    private processEvents(
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
                    const decoded = decodeApprovedEvent(event.data);
                    const ownerHex = decoded.owner.toHex().toLowerCase();

                    if (ownerHex !== this.ownerHex) continue;

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
