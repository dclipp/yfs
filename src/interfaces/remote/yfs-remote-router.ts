import { YfsRoute } from './yfs-route';

export interface YfsRemoteRouter {
    getRoute(containerPath: string, dirName: string): Promise<YfsRoute | null>;
}