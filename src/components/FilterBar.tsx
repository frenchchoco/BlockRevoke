import { type ReactElement, useState, useMemo, useCallback, useEffect } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Approval, RiskLevel } from '../types/approval';
import { Search } from 'lucide-react';

type RiskFilter = 'all' | RiskLevel;

interface FilterBarProps {
    readonly approvals: Approval[];
    readonly onFiltered: (filtered: Approval[]) => void;
}

const RISK_OPTIONS: { value: RiskFilter; label: string }[] = [
    { value: 'all', label: 'All Risks' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

export function FilterBar({ approvals, onFiltered }: FilterBarProps): ReactElement {
    const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = useMemo((): Approval[] => {
        let result = approvals;

        if (riskFilter !== 'all') {
            result = result.filter((a) => a.riskScore === riskFilter);
        }

        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (a) =>
                    a.tokenName.toLowerCase().includes(q) ||
                    a.tokenSymbol.toLowerCase().includes(q) ||
                    a.tokenAddress.toLowerCase().includes(q) ||
                    a.spenderAddress.toLowerCase().includes(q) ||
                    (a.spenderLabel !== null && a.spenderLabel.toLowerCase().includes(q)),
            );
        }

        return result;
    }, [approvals, riskFilter, searchQuery]);

    // Notify parent whenever filtered results change
    useEffect((): void => {
        onFiltered(filtered);
    }, [filtered, onFiltered]);

    const handleRiskChange = useCallback((value: string): void => {
        setRiskFilter(value as RiskFilter);
    }, []);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>): void => {
            setSearchQuery(e.target.value);
        },
        [],
    );

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
            <Select value={riskFilter} onValueChange={handleRiskChange}>
                <SelectTrigger className="w-[160px]" size="sm">
                    <SelectValue placeholder="Filter by risk" />
                </SelectTrigger>
                <SelectContent>
                    {RISK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <Input
                    placeholder="Search tokens, spenders..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-9 h-8"
                />
            </div>
        </div>
    );
}
