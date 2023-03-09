import { YfsRemoteResolver } from '../interfaces/remote/yfs-remote-resolver';
import { YfsStatus } from '../interfaces/yfs-status';
import { YfsRemoteRouter } from '../interfaces/remote/yfs-remote-router';
import { YfsDirectory as IYfsDirectory } from '../interfaces/yfs-directory';
import { YfsFile as IYfsFile } from '../interfaces/yfs-file';
import { YfsAsset } from '../interfaces/yfs-asset';
import { YfsDirectory } from './yfs-directory';
import { YfsFile } from './yfs-file';
import { YfsRemoteOpts } from '../interfaces/config/yfs-remote-opts';
import { AssetNameParser } from './asset-name-parser';
import { YfsRemoteEndpoint } from '../interfaces/remote/yfs-remote-endpoint';

export class RemoteResolver2 implements YfsRemoteResolver {
    public async loadDirectory(containerPath: string, dirName: string): Promise<YfsStatus> {
        const directory = await this._getDirectory(containerPath, dirName);
        const route = directory === null
            ? null
            : await this._router.getRoute(containerPath, dirName);
        if (route === null) {
            return YfsStatus.AssetNotFound;
        } else {
            const endpoint = this._endpoints.find(e => e.name === route.endpointName);
            if (!!endpoint) {
                try {
                    const inputs = await endpoint.fetch(route);
                    const rootIndex = inputs.findIndex(i => i.containerPath.toLowerCase() === containerPath.toLowerCase()
                        && (i.isDirectory ? i.name : AssetNameParser.joinFileNameParts(i.title, i.extension)).toLowerCase() === dirName.toLowerCase());
                    if (rootIndex > -1) {
                        const childAssets = new Array<YfsAsset>();
                        for (let i = 0; i < inputs.length; i++) {
                            if (i !== rootIndex) {
                                const input = inputs[i];
                                let asset: YfsAsset;
                                if (input.isDirectory) {
                                    asset = await YfsDirectory.createNew(input.containerPath, input.name, input.isLoaded !== false, input.isDeleted === true, this._getContents);
                                } else {
                                    const f = input as IYfsFile;
                                    asset = await YfsFile.createNew(f.containerPath, f.title, f.extension, f.content, f.isDeleted);
                                }

                                childAssets.push(asset);
                            }
                        }

                        await this._pushLoadedDirectory(
                            containerPath,
                            dirName,
                            childAssets
                        );

                        return YfsStatus.OK;
                    } else {
                        return YfsStatus.IOError;
                    }
                } catch (ex) {
                    return YfsStatus.IOError;
                }
            } else {
                return YfsStatus.AssetNotFound;
            }
        }
    }

    private constructor(remoteOpts: YfsRemoteOpts, dataFns: {
        readonly pushLoadedDirectory: (containerPath: string, dirName: string, childAssets: Array<YfsAsset>) => Promise<void>,
        readonly getContents: (containerPath: string) => Promise<Array<YfsAsset>>,
        readonly getDirectory: (containerPath: string, dirName: string) => Promise<IYfsDirectory | null>
    }) {
        this._endpoints = remoteOpts.endpoints || [];
        this._router = {
            getRoute: (containerPath, dirName) => {
                return remoteOpts.mapRoute(containerPath, dirName);
            }
        };
        this._pushLoadedDirectory = dataFns.pushLoadedDirectory;
        this._getContents = dataFns.getContents;
        this._getDirectory = dataFns.getDirectory;
    }

    private readonly _endpoints: Array<YfsRemoteEndpoint>;
    private readonly _router: YfsRemoteRouter;
    private readonly _pushLoadedDirectory: (containerPath: string, dirName: string, childAssets: Array<YfsAsset>) => Promise<void>;
    private readonly _getContents: (containerPath: string) => Promise<Array<YfsAsset>>;
    private readonly _getDirectory: (containerPath: string, dirName: string) => Promise<IYfsDirectory | null>;

    public static create(dataFns: {
        readonly pushLoadedDirectory: (containerPath: string, dirName: string, childAssets: Array<YfsAsset>) => Promise<void>,
        readonly getContents: (containerPath: string) => Promise<Array<YfsAsset>>,
        readonly getDirectory: (containerPath: string, dirName: string) => Promise<IYfsDirectory | null>
    }, remoteOpts?: YfsRemoteOpts): RemoteResolver2 {
        const useRemoteOpts: YfsRemoteOpts = !!remoteOpts
            ? remoteOpts
            : {
                mapRoute: async (containerPath, dirName) => null
            };

        return new RemoteResolver2(useRemoteOpts, dataFns);
    }
}