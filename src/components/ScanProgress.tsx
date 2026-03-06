import { type ReactElement } from 'react';
import { Play, Square, RefreshCw, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';
import { useScan } from '../hooks/useScan';

export function ScanProgress(): ReactElement {
    const {
        isScanning,
        currentBlock,
        latestBlock,
        lastScannedBlock,
        progress,
        startScan,
        stopScan,
    } = useScan();

    // Never scanned and not scanning
    if (!isScanning && lastScannedBlock === 0 && currentBlock === 0) {
        return (
            <Card className="mb-4">
                <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Search className="size-4" />
                        <span>Start scanning to discover all approvals</span>
                    </div>
                    <Button size="sm" onClick={startScan}>
                        <Play className="mr-1 size-3" />
                        Scan
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Scanning in progress
    if (isScanning) {
        return (
            <Card className="mb-4">
                <CardContent className="space-y-2 py-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">
                            Scanning block {currentBlock.toLocaleString()} /{' '}
                            {latestBlock.toLocaleString()} ({progress}%)
                        </span>
                        <Button size="sm" variant="destructive" onClick={stopScan}>
                            <Square className="mr-1 size-3" />
                            Stop
                        </Button>
                    </div>
                    <Progress value={progress} className="h-2" />
                </CardContent>
            </Card>
        );
    }

    // Scan complete
    return (
        <Card className="mb-4">
            <CardContent className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">
                    Scan complete. Last scanned block:{' '}
                    {lastScannedBlock.toLocaleString()}
                </span>
                <Button size="sm" variant="outline" onClick={startScan}>
                    <RefreshCw className="mr-1 size-3" />
                    Rescan
                </Button>
            </CardContent>
        </Card>
    );
}
