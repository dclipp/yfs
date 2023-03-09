import { YfsAsset } from './yfs-asset';

export interface YfsFile extends YfsAsset {
    readonly title: string;
    readonly extension: string;
    readonly content: string;
}