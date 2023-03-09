import { YfsOutput } from './yfs-output';
import { Yfs } from './yfs';
import { YfsContext } from './yfs-context';
import { YfsStatus } from './yfs-status';
import { YfsAssetInput } from './yfs-asset-input';

export interface YfsTransaction extends YfsContext {
    openDirectory(path: string): Promise<YfsOutput<Yfs>>;

    // squashDeltas(containerPathStartsWith: string, toTimestamp: number): Promise<number>;
    discardDeltas(containerPathStartsWith: string, afterTimestamp: number): Promise<number>;

    restoreDeletedAsset(pathAtDeletion: string): Promise<YfsStatus>;
    importAssets(...assets: Array<YfsAssetInput>): Promise<YfsStatus>;
    
    purgeAsset(deletedPath: string): Promise<YfsStatus>;
    
    commit(): Promise<void>;
    cancel(): void;

    isDisposed(): boolean;
}