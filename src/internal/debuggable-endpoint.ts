import { YfsDebugAsset } from '../interfaces/debug/yfs-debug-asset';
import { YfsDebuggableEndpoint } from '../interfaces/debug/yfs-debuggable-endpoint';

export class DebuggableEndpoint implements YfsDebuggableEndpoint {
    public readonly absolutePath: string;
    
    public async getAllAssets(): Promise<Array<YfsDebugAsset>> {
        return await this._getDebugAssets();
    }
    
    public constructor(absolutePath: string, getDebugAssets: () => Promise<Array<YfsDebugAsset>>) {
        this._getDebugAssets = getDebugAssets;
        this.absolutePath = absolutePath;
    }

    private readonly _getDebugAssets: () => Promise<Array<YfsDebugAsset>>;
}