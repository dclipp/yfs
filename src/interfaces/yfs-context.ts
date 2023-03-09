import { YfsAsset } from './yfs-asset';
import { YfsAssetInput } from './yfs-asset-input';
import { YfsDelta } from './yfs-delta';
import { YfsFile } from './yfs-file';
import { YfsOutput } from './yfs-output';
import { YfsStatus } from './yfs-status';

export interface YfsContext {
    createDirectory(containerPath: string, name: string, isLoaded?: boolean): Promise<YfsStatus>;
    createSymlink(containerPath: string, name: string, targetPath: string): Promise<YfsStatus>;

    createFile(containerPath: string, title: string, extension: string, content?: string): Promise<YfsStatus>;

    getAsset(path: string): Promise<YfsOutput<YfsAsset>>;
    moveAsset(oldPath: string, newContainerPath: string): Promise<YfsStatus>;
    renameAsset(path: string, newName: string): Promise<YfsStatus>;
    deleteAsset(path: string): Promise<YfsStatus>;
    getAssetFromHistory(path: string, versionTimestamp: number, versionMatch?: 'exact' | 'less-than' | 'greater-than' | 'less-than-or-eq' | 'greater-than-or-eq'): Promise<YfsOutput<YfsAsset>>;
    
    updateFileContent(path: string, updatedContent: string): Promise<YfsStatus>;

    readDirectory(path: string, recursive?: boolean): Promise<YfsOutput<Array<YfsAsset>>>;
    readFile(path: string): Promise<YfsOutput<YfsFile>>;
    findFiles(title: string, extension: string, containerPath?: string): Promise<YfsOutput<Array<YfsFile>>>;
    
    loadRemoteDirectory(path: string, force?: boolean): Promise<YfsStatus>;

    assetExists(path: string): Promise<YfsOutput<boolean>>;

    getDeltas(): Promise<Array<YfsDelta>>;
    getAssetHistory(pathQuery: string, includeDeletes?: boolean): Promise<Array<YfsDelta>>;

    watchAsset(path: string, subscriber: (delta: YfsDelta) => void): { unsubscribe(): void; };

    /** { absolutePath: string, assets: Array<YfsAssetInput> } */
    serializeAssets(): Promise<string>;
    asInputDataset(): Promise<{
        readonly absolutePath: string;
        readonly assets: Array<YfsAssetInput>;
    }>;
    
    readonly absolutePath: string;
}