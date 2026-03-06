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

/* ── Turbo Tuning ──────────────────────────────────────────── */

/**
 * Initial blocks per single RPC call.
 * Adaptive: will halve on repeated failures.
 */
const INITIAL_BATCH_SIZE = 200;

/** Minimum batch size before giving up on a range. */
const MIN_BATCH_SIZE = 25;

/** Number of concurrent batch fetches. */
const CONCURRENCY = 10;

/** Max retries per failed batch before reducing size. */
const MAX_RETRIES = 3;

function delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class BlockScanner {
    #cancelled = false;
    readonly #provider: JSONRpcProvider;
    readonly #ownerHex: string;
    #currentBatchSize: number = INITIAL_BATCH_SIZE;

    constructor(networkId: NetworkId, ownerAddress: string) {
        this.#provider = getReadProvider(networkId);
        this.#ownerHex = ownerAddress.toLowerCase();
    }

    async scan(startBlock: number, callbacks: ScanCallbacks): Promise<void> {
        this.#cancelled = false;
        this.#currentBatchSize = INITIAL_BATCH_SIZE;

        try {
            const latestBlockBig: bigint = await this.#provider.getBlockNumber();
            const latestBlock: number = Number(latestBlockBig);
            const totalBlocks = latestBlock - startBlock + 1;

            console.log(
                `[BlockRevoke] Turbo scan: ${totalBlocks} blocks (${startBlock}..${latestBlock}), batch=${this.#currentBatchSize}, concurrency=${CONCURRENCY}`,
            );

            // Build all batch ranges upfront (adaptive size)
            const batches = this.#buildBatches(startBlock, latestBlock);

            // Process batches with concurrency pool
            let highestCompleted = startBlock;

            for (let i = 0; i < batches.length; i += CONCURRENCY) {
                if (this.#cancelled) break;

                const chunk = batches.slice(i, i + CONCURRENCY);

                const results = await Promise.allSettled(
                    chunk.map((batch) => this.#fetchBatchAdaptive(batch.from, batch.to)),
                );

                // Process results in order
                for (let j = 0; j < results.length; j++) {
                    if (this.#cancelled) break;
                    const result = results[j] as PromiseSettledResult<Block[] | null>;
                    const batch = chunk[j] as { from: number; to: number };

                    if (result.status === 'fulfilled' && result.value) {
                        for (const block of result.value) {
                            if (this.#cancelled) break;
                            this.#processBlockData(block, callbacks);
                        }
                    }

                    highestCompleted = batch.to;
                }

                callbacks.onProgress(highestCompleted, latestBlock);
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

    #buildBatches(startBlock: number, latestBlock: number): Array<{ from: number; to: number }> {
        const batches: Array<{ from: number; to: number }> = [];
        const size = this.#currentBatchSize;
        for (let b = startBlock; b <= latestBlock; b += size) {
            batches.push({ from: b, to: Math.min(b + size - 1, latestBlock) });
        }
        return batches;
    }

    /**
     * Fetch a batch of blocks with adaptive sizing.
     * On failure, halves the batch and retries the sub-ranges.
     */
    async #fetchBatchAdaptive(from: number, to: number): Promise<Block[] | null> {
        const blockTags: bigint[] = [];
        for (let b = from; b <= to; b++) {
            blockTags.push(BigInt(b));
        }

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                return await this.#provider.getBlocks(blockTags, true);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.warn(
                    `[BlockRevoke] getBlocks ${from}-${to} (${blockTags.length} blocks) attempt ${attempt + 1} failed: ${msg}`,
                );

                if (attempt < MAX_RETRIES - 1) {
                    await delay(200 * (attempt + 1));
                }
            }
        }

        // All retries failed — try splitting into smaller sub-batches
        const rangeSize = to - from + 1;
        if (rangeSize > MIN_BATCH_SIZE) {
            const mid = from + Math.floor(rangeSize / 2);
            console.log(`[BlockRevoke] Splitting failed range ${from}-${to} into ${from}-${mid - 1} and ${mid}-${to}`);

            // Reduce global batch size for future batches
            this.#currentBatchSize = Math.max(MIN_BATCH_SIZE, Math.floor(this.#currentBatchSize / 2));

            const [left, right] = await Promise.all([
                this.#fetchBatchAdaptive(from, mid - 1),
                this.#fetchBatchAdaptive(mid, to),
            ]);

            const combined: Block[] = [];
            if (left) combined.push(...left);
            if (right) combined.push(...right);
            return combined.length > 0 ? combined : null;
        }

        return null;
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
                } catch (err: unknown) {
                    console.warn(
                        `[BlockRevoke] Failed to decode Approved event at block ${blockNumber}: ${err instanceof Error ? err.message : String(err)}`,
                    );
                }
            }
        }
    }
}
