import { getContract, type IOP20Contract, OP_20_ABI } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { toSatoshi, type PsbtOutputExtended } from '@btc-vision/bitcoin';
import type { NetworkId } from '../types/network';
import type { Approval, TokenInfo } from '../types/approval';
import { KNOWN_TOKENS } from '../config/knownTokens';
import { KNOWN_SPENDERS } from '../config/knownSpenders';
import { UNLIMITED_THRESHOLD, DEV_ADDRESS, DEV_FEE_SATS } from '../config/constants';
import { getReadProvider, getNetwork } from './providerService';
import { calculateRiskScore } from '../lib/riskScoring';
import { discoverFactoryTokens } from './factoryService';

export async function discoverKnownApprovals(
    networkId: NetworkId,
    ownerAddress: string,
): Promise<Approval[]> {
    const provider = getReadProvider(networkId);
    const network = getNetwork(networkId);
    const owner = Address.fromString(ownerAddress);

    // Merge known tokens with factory-discovered tokens (dedup by address)
    const knownTokens: readonly TokenInfo[] = KNOWN_TOKENS[networkId];

    let factoryTokens: TokenInfo[] = [];
    try {
        factoryTokens = await discoverFactoryTokens(networkId);
    } catch {
        // Factory discovery failed; continue with known tokens only
    }

    const seenAddresses = new Set<string>(knownTokens.map((t) => t.address.toLowerCase()));
    const dedupedFactoryTokens = factoryTokens.filter(
        (t) => !seenAddresses.has(t.address.toLowerCase()),
    );
    const tokens: readonly TokenInfo[] = [...knownTokens, ...dedupedFactoryTokens];

    const spenders = KNOWN_SPENDERS[networkId];
    const approvals: Approval[] = [];

    for (const token of tokens) {
        const tokenAddr = Address.fromString(token.address);
        const contract = getContract<IOP20Contract>(
            tokenAddr,
            OP_20_ABI,
            provider,
            network,
            owner,
        );

        let balance = 0n;
        try {
            const balanceResult = await contract.balanceOf(owner);
            balance = balanceResult.properties.balance;
        } catch {
            // Token may not exist or owner has no balance; continue
        }

        for (const spender of spenders) {
            const spenderAddr = Address.fromString(spender.address);

            try {
                const allowanceResult = await contract.allowance(owner, spenderAddr);
                const allowance = allowanceResult.properties.remaining;

                if (allowance > 0n) {
                    const riskScore = calculateRiskScore(allowance, balance, true);

                    approvals.push({
                        id: `${token.address}:${spender.address}`,
                        tokenAddress: token.address,
                        tokenName: token.name,
                        tokenSymbol: token.symbol,
                        tokenDecimals: token.decimals,
                        spenderAddress: spender.address,
                        spenderLabel: spender.label,
                        allowance,
                        isUnlimited: allowance >= UNLIMITED_THRESHOLD,
                        riskScore,
                        discoveredVia: 'known',
                        lastUpdatedBlock: null,
                        lastUpdatedTxHash: null,
                    });
                }
            } catch {
                // Allowance call failed; skip this pair
            }
        }
    }

    return approvals;
}

export async function revokeApproval(
    networkId: NetworkId,
    ownerAddress: string,
    tokenAddress: string,
    spenderAddress: string,
    currentAllowance: bigint,
    devFeeRequired: boolean,
): Promise<string> {
    const provider = getReadProvider(networkId);
    const network = getNetwork(networkId);
    const owner = Address.fromString(ownerAddress);
    const spenderAddr = Address.fromString(spenderAddress);

    const contract = getContract<IOP20Contract>(
        Address.fromString(tokenAddress),
        OP_20_ABI,
        provider,
        network,
        owner,
    );

    const simulation = await contract.decreaseAllowance(spenderAddr, currentAllowance);

    if (simulation.revert) {
        throw new Error(`Simulation reverted: ${simulation.revert}`);
    }

    const devFeeOutputs: PsbtOutputExtended[] = [{
        address: DEV_ADDRESS,
        value: toSatoshi(DEV_FEE_SATS),
    }];

    const txOptions = {
        signer: null,
        mldsaSigner: null,
        refundTo: owner.p2tr(network),
        maximumAllowedSatToSpend: 100_000n,
        network,
        ...(devFeeRequired ? { extraOutputs: devFeeOutputs } : {}),
    };

    const receipt = await simulation.sendTransaction(txOptions);

    return receipt.transactionId;
}

export async function editAllowance(
    networkId: NetworkId,
    ownerAddress: string,
    tokenAddress: string,
    spenderAddress: string,
    currentAllowance: bigint,
    newAllowance: bigint,
    devFeeRequired: boolean,
): Promise<string> {
    const provider = getReadProvider(networkId);
    const network = getNetwork(networkId);
    const owner = Address.fromString(ownerAddress);
    const spenderAddr = Address.fromString(spenderAddress);

    const contract = getContract<IOP20Contract>(
        Address.fromString(tokenAddress),
        OP_20_ABI,
        provider,
        network,
        owner,
    );

    let simulation;
    if (newAllowance < currentAllowance) {
        const delta = currentAllowance - newAllowance;
        simulation = await contract.decreaseAllowance(spenderAddr, delta);
    } else {
        const delta = newAllowance - currentAllowance;
        simulation = await contract.increaseAllowance(spenderAddr, delta);
    }

    if (simulation.revert) {
        throw new Error(`Simulation reverted: ${simulation.revert}`);
    }

    const devFeeOutputs: PsbtOutputExtended[] = [{
        address: DEV_ADDRESS,
        value: toSatoshi(DEV_FEE_SATS),
    }];

    const txOptions = {
        signer: null,
        mldsaSigner: null,
        refundTo: owner.p2tr(network),
        maximumAllowedSatToSpend: 100_000n,
        network,
        ...(devFeeRequired ? { extraOutputs: devFeeOutputs } : {}),
    };

    const receipt = await simulation.sendTransaction(txOptions);

    return receipt.transactionId;
}
