import { YfsDebugAsset } from './yfs-debug-asset';

export interface YfsDebuggableEndpoint {
    readonly absolutePath: string;
    getAllAssets(): Promise<Array<YfsDebugAsset>>;
}