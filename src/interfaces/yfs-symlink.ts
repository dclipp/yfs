import { YfsDirectory } from './yfs-directory';

export interface YfsSymlink extends YfsDirectory {
    readonly targetPath: string;
}