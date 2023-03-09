import { YfsAsset } from './yfs-asset';

export interface YfsDirectory extends YfsAsset {
    // readonly isRemote: boolean;

    // readonly lazyLoad: boolean;
    readonly isLoaded: boolean;
    readonly isSymlink: boolean;
}