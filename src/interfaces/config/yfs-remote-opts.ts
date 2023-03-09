import { YfsRemoteEndpoint } from '../remote/yfs-remote-endpoint';
import { YfsRoute } from '../remote/yfs-route';

export interface YfsRemoteOpts {
    mapRoute(containerPath: string, dirName: string): Promise<YfsRoute | null>;
    
    readonly endpoints?: Array<YfsRemoteEndpoint>;
}