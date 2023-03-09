import { YfsDelta } from '../yfs-delta';

export interface YfsDebugAsset {
    readonly publicName: string;
    readonly containerPath: string;
    readonly isDirectory: boolean;
    readonly isDeleted: boolean;
    readonly infoTimestamp: number;
    readonly delta: YfsDelta;
}