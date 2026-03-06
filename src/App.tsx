import { type ReactElement, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HeroBanner } from './components/HeroBanner';
import { NetworkSync } from './components/NetworkSync';
import { DashboardSummary } from './components/DashboardSummary';
import { FilterBar } from './components/FilterBar';
import { ApprovalTable } from './components/ApprovalTable';
import { RevokeConfirmDialog } from './components/RevokeConfirmDialog';
import { EditModal } from './components/EditModal';
import { BatchActions } from './components/BatchActions';
import { ScanProgress } from './components/ScanProgress';
import { HistoryTimeline } from './components/HistoryTimeline';
import { ParticleBackground } from './components/ParticleBackground';
import { CelebrationEffect } from './components/CelebrationEffect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { useApprovals } from './hooks/useApprovals';
import { useWallet } from './hooks/useWallet';
import { useRevokeAction } from './hooks/useRevokeAction';
import { useEditAction } from './hooks/useEditAction';
import { useBatchRevoke } from './hooks/useBatchRevoke';
import type { Approval } from './types/approval';
import { cn } from '@/lib/utils';

export default function App(): ReactElement {
    const { approvals, isLoading } = useApprovals();
    const { isReady } = useWallet();

    const [filteredApprovals, setFilteredApprovals] = useState<Approval[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showCelebration, setShowCelebration] = useState(false);

    // Revoke action
    const {
        targetApproval: revokeTarget,
        isLoading: revokeLoading,
        error: revokeError,
        startRevoke,
        confirmRevoke: rawConfirmRevoke,
        cancelRevoke,
    } = useRevokeAction();

    // Wrap confirmRevoke to trigger celebration + pass feeRate
    const confirmRevoke = useCallback((feeRate?: number): void => {
        void rawConfirmRevoke(feeRate).then(() => {
            setShowCelebration(true);
        });
    }, [rawConfirmRevoke]);

    // Edit action
    const {
        targetApproval: editTarget,
        isLoading: editLoading,
        error: editError,
        startEdit,
        confirmEdit,
        cancelEdit,
    } = useEditAction();

    // Batch revoke
    const {
        batchState,
        executeBatch,
        cancelBatch,
    } = useBatchRevoke();

    const handleFiltered = useCallback((filtered: Approval[]): void => {
        setFilteredApprovals(filtered);
    }, []);

    const handleSelectToggle = useCallback((id: string): void => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback((): void => {
        setSelectedIds((prev) => {
            if (prev.size === filteredApprovals.length) {
                return new Set<string>();
            }
            return new Set(filteredApprovals.map((a) => a.id));
        });
    }, [filteredApprovals]);

    const handleRevoke = useCallback(
        (approval: Approval): void => {
            startRevoke(approval);
        },
        [startRevoke],
    );

    const handleEdit = useCallback(
        (approval: Approval): void => {
            startEdit(approval);
        },
        [startEdit],
    );

    const selectedApprovals = useMemo((): Approval[] => {
        return approvals.filter((a) => selectedIds.has(a.id));
    }, [approvals, selectedIds]);

    const handleBatchExecute = useCallback((feeRate?: number): void => {
        void executeBatch(selectedApprovals, feeRate);
    }, [selectedApprovals, executeBatch]);

    const handleBatchCancel = useCallback((): void => {
        cancelBatch();
    }, [cancelBatch]);

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground relative">
            <ParticleBackground />
            <NetworkSync />

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header />

                <motion.main
                    className={cn('flex-1 container mx-auto px-4 py-6 max-w-6xl', selectedIds.size > 0 && 'pb-24')}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <HeroBanner />

                    {isReady ? <ScanProgress /> : null}

                    <Tabs defaultValue="approvals" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="approvals">Approvals</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="approvals">
                            <DashboardSummary approvals={filteredApprovals} />
                            <FilterBar approvals={approvals} onFiltered={handleFiltered} />
                            <ApprovalTable
                                approvals={filteredApprovals}
                                selectedIds={selectedIds}
                                onSelectToggle={handleSelectToggle}
                                onSelectAll={handleSelectAll}
                                onRevoke={handleRevoke}
                                onEdit={handleEdit}
                                isLoading={isLoading}
                                isConnected={isReady}
                            />
                        </TabsContent>

                        <TabsContent value="history">
                            <HistoryTimeline />
                        </TabsContent>
                    </Tabs>
                </motion.main>

                <Footer />
            </div>

            <RevokeConfirmDialog
                approval={revokeTarget}
                onConfirm={confirmRevoke}
                onCancel={cancelRevoke}
                isLoading={revokeLoading}
                error={revokeError}
            />

            <EditModal
                approval={editTarget}
                onSave={confirmEdit}
                onCancel={cancelEdit}
                isLoading={editLoading}
                error={editError}
            />

            {selectedIds.size > 0 ? (
                <BatchActions
                    selectedApprovals={selectedApprovals}
                    onExecute={handleBatchExecute}
                    onCancel={handleBatchCancel}
                    batchState={batchState}
                />
            ) : null}

            <CelebrationEffect
                trigger={showCelebration}
                onComplete={(): void => setShowCelebration(false)}
            />
        </div>
    );
}
