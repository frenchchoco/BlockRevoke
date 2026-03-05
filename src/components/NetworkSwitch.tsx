import type { ReactElement } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useNetworkStore } from '../stores/networkStore';
import { NETWORK_CONFIGS } from '../config/networks';
import type { NetworkId } from '../types/network';

const NETWORK_IDS: readonly NetworkId[] = ['mainnet', 'testnet'] as const;

export function NetworkSwitch(): ReactElement {
    const networkId = useNetworkStore((s) => s.networkId);
    const setNetwork = useNetworkStore((s) => s.setNetwork);

    return (
        <Select value={networkId} onValueChange={(v: string): void => setNetwork(v as NetworkId)}>
            <SelectTrigger className="w-[140px]" size="sm">
                <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
                {NETWORK_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                        {NETWORK_CONFIGS[id].name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
