import { YfsRemoteOpts } from './yfs-remote-opts';

export interface YfsConfig {
    readonly disableLazyLoad?: boolean;
    readonly remoteOpts?: YfsRemoteOpts;
    readonly debugMode?: {
        readonly instanceName: string;
    };
}