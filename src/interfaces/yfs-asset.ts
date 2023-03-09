import { YfsAssetInput } from './yfs-asset-input';
import { YfsDelta } from './yfs-delta';

export interface YfsAsset {
    readonly publicName: string;
    readonly containerPath: string;
    readonly isDirectory: boolean;
    readonly isDeleted: boolean;
    readonly infoTimestamp: number;
    readonly delta: YfsDelta;

    computeHash(): Promise<string>;
    asInput(): YfsAssetInput;
}