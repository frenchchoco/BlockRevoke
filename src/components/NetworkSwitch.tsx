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
const VALID_NETWORK_IDS = new Set<string>(NETWORK_IDS);

function isNetworkId(value: string): value is NetworkId {
    return VALID_NETWORK_IDS.has(value);
}

const DOT_COLOR: Record<NetworkId, string> = {
    mainnet: 'bg-v-green',
    testnet: 'bg-v-orange',
};

export function NetworkSwitch(): ReactElement {
    const networkId: NetworkId = useNetworkStore((s) => s.networkId);
    const setNetwork = useNetworkStore((s) => s.setNetwork);

    const handleChange = (v: string): void => {
        if (isNetworkId(v)) {
            setNetwork(v);
        }
    };

    return (
        <Select value={networkId} onValueChange={handleChange}>
            <SelectTrigger className="w-[140px]" size="sm">
                <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${DOT_COLOR[networkId]}`} />
                    <SelectValue placeholder="Select network" />
                </span>
            </SelectTrigger>
            <SelectContent>
                {NETWORK_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                        <span className="flex items-center gap-2">
                            <span className={`size-2 rounded-full ${DOT_COLOR[id]}`} />
                            {NETWORK_CONFIGS[id].name}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
