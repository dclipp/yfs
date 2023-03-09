import { YfsStatus } from '../yfs-status';

export interface YfsRemoteResolver {
    loadDirectory(containerPath: string, dirName: string): Promise<YfsStatus>;
}