import { YfsDeltaAssetType } from './yfs-delta-asset-type';
import { YfsDeltaType } from './yfs-delta-type';

export interface YfsDelta {
    readonly oldPath: string;
    readonly newPath: string;
    readonly type: YfsDeltaType;
    readonly timestamp: number;
    readonly assetType: YfsDeltaAssetType;
    readonly trackingKey: string;
    readonly detail?: string;
}