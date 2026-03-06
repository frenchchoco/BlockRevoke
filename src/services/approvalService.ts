import { Address } from '@btc-vision/transaction';
import { networks, toSatoshi, type PsbtOutputExtended } from '@btc-vision/bitcoin';
import type { NetworkId } from '../types/network';
import type { Approval, TokenInfo } from '../types/approval';
import { KNOWN_TOKENS } from '../config/knownTokens';
import { KNOWN_SPENDERS } from '../config/knownSpenders';
import { UNLIMITED_THRESHOLD, DEV_ADDRESS, DEV_FEE_SATS } from '../config/constants';
import { getNetwork } from './providerService';
import { getOP20Contract } from './contractService';
import { calculateRiskScore } from '../lib/riskScoring';
import { discoverFactoryTokens } from './factoryService';
import { isValidBitcoinAddress } from '../lib/addressValidation';

/**
 * Validate DEV_ADDRESS at module load using AddressVerificator.
 * If the env variable is set but invalid, fee outputs will be silently skipped.
 */
const VALIDATED_DEV_ADDRESS: string | null = (() => {
    if (DEV_ADDRESS === null) return null;
    // Validate against both mainnet and testnet; accept if valid on either.
    if (
        isValidBitcoinAddress(DEV_ADDRESS, networks.bitcoin) ||
        isValidBitcoinAddress(DEV_ADDRESS, networks.opnetTestnet)
    ) {
        return DEV_ADDRESS;
    }
    return null;
})();

export async function discoverKnownApprovals(
    networkId: NetworkId,
    ownerAddress: string,
): Promise<Approval[]> {
    const owner = Address.fromString(ownerAddress);

    // Merge known tokens with factory-discovered tokens (dedup by address)
    const knownTokens: readonly TokenInfo[] = KNOWN_TOKENS[networkId];

    let factoryTokens: readonly TokenInfo[] = [];
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
        const contract = getOP20Contract(token.address, networkId, owner);

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
    const network = getNetwork(networkId);
    const owner = Address.fromString(ownerAddress);
    const spenderAddr = Address.fromString(spenderAddress);

    const contract = getOP20Contract(tokenAddress, networkId, owner);

    const simulation = await contract.decreaseAllowance(spenderAddr, currentAllowance);

    if (simulation.revert) {
        throw new Error(`Simulation reverted: ${simulation.revert}`);
    }

    const shouldChargeFee: boolean = devFeeRequired && VALIDATED_DEV_ADDRESS !== null;
    const devFeeOutputs: PsbtOutputExtended[] = VALIDATED_DEV_ADDRESS !== null
        ? [{ address: VALIDATED_DEV_ADDRESS, value: toSatoshi(DEV_FEE_SATS) }]
        : [];

    const txOptions = {
        signer: null,
        mldsaSigner: null,
        refundTo: owner.p2tr(network),
        maximumAllowedSatToSpend: 100_000n,
        network,
        ...(shouldChargeFee ? { extraOutputs: devFeeOutputs } : {}),
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
    const network = getNetwork(networkId);
    const owner = Address.fromString(ownerAddress);
    const spenderAddr = Address.fromString(spenderAddress);

    const contract = getOP20Contract(tokenAddress, networkId, owner);

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

    const shouldChargeFee: boolean = devFeeRequired && VALIDATED_DEV_ADDRESS !== null;
    const devFeeOutputs: PsbtOutputExtended[] = VALIDATED_DEV_ADDRESS !== null
        ? [{ address: VALIDATED_DEV_ADDRESS, value: toSatoshi(DEV_FEE_SATS) }]
        : [];

    const txOptions = {
        signer: null,
        mldsaSigner: null,
        refundTo: owner.p2tr(network),
        maximumAllowedSatToSpend: 100_000n,
        network,
        ...(shouldChargeFee ? { extraOutputs: devFeeOutputs } : {}),
    };

    const receipt = await simulation.sendTransaction(txOptions);

    return receipt.transactionId;
}
