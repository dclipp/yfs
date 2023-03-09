import { YfsAssetInput } from '../yfs-asset-input';
import { YfsRoute } from './yfs-route';

export interface YfsRemoteEndpoint {
    readonly name: string;
    fetch(route: YfsRoute): Promise<Array<YfsAssetInput>>;
}