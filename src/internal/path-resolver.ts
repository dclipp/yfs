import md5 from 'md5';

export class PathResolver {
    public resolve(inputPath: string): string {
        const cachedPath = this._cache2.get(inputPath);
        if (cachedPath === undefined) {
            let outputPath = inputPath;
            const rootMatch = inputPath === '/'
                ? null
                : this.findRootMatch(inputPath);
            if (rootMatch !== null && !rootMatch.isExactMatch) {
                outputPath = `${this._symbolicPaths[rootMatch.index].realPath}${inputPath.substring(rootMatch.length)}`;
            }

            this._cache2.set(inputPath, outputPath);
            return outputPath;
        } else {
            return cachedPath;
        }
    }

    public addSymbolicPath(symPath: string, targetPath: string): void {
        const existingIndex = this._symbolicPaths.findIndex(sp => sp.symPath.toLowerCase().startsWith(symPath.toLowerCase()));
        if (existingIndex > -1) {
            if (this._symbolicPaths[existingIndex].symPath.length > symPath.length) {
                this._cache2.clearPathsForRoot(this._symbolicPaths[existingIndex].symPath);
                this._symbolicPaths[existingIndex] = {
                    symPath: symPath,
                    realPath: targetPath
                };
            }
        } else {
            this._symbolicPaths.push({
                symPath: symPath,
                realPath: targetPath
            });
        }
    }

    public constructor() {
        this._symbolicPaths = new Array<{
            readonly symPath: string;
            readonly realPath: string;
        }>();
    }

    private findRootMatch(inputPath: string): {
        readonly index: number;
        readonly length: number;
        readonly isExactMatch: boolean;
    } | null {
        const ipl = inputPath.toLowerCase();
        let index = -1;
        let matchLength = 0;
        let isExactMatch = false;
        for (let i = 0; i < this._symbolicPaths.length && index === -1; i++) {
            const spl = this._symbolicPaths[i].symPath.toLowerCase();
            if (ipl.startsWith(spl)) {
                index = i;
                matchLength = spl.length;
                isExactMatch = spl.length === ipl.length;
            }
            
        }

        if (index > -1) {
            return {
                index: index,
                length: matchLength,
                isExactMatch: isExactMatch
            }
        } else {
            return null;
        }
    }

    private readonly _cache2 = createCache();
    // private readonly _cache: Map<string, string>;
    private readonly _symbolicPaths: Array<{
        readonly symPath: string;
        readonly realPath: string;
    }>;
}

function createCache(): {
    get(path: string): string | undefined;
    set(inputPath: string, outputPath: string): void;
    clearPathsForRoot(rootPath: string): void;
} {
    const items = new Array<{
        readonly hash: string;
        readonly inputPathValue: string;
        readonly inputPathValueLowerCase: string;
        readonly outputPath: string;
    }>();

    return {
        get: (path) => {
            const pl = path.toLowerCase();
            const hash = md5(pl);
            const item = items.find(i => i.hash === hash);
            return !!item
                ? item.outputPath
                : undefined;
        },
        set: (inputPath, outputPath) => {
            const pl = inputPath.toLowerCase();
            const hash = md5(pl);
            const itemIndex = items.findIndex(i => i.hash === hash);
            if (itemIndex < 0) {
                items.push({
                    hash: hash,
                    inputPathValue: inputPath,
                    inputPathValueLowerCase: pl,
                    outputPath: outputPath
                });
            } else {
                items[itemIndex] = {
                    hash: hash,
                    inputPathValue: inputPath,
                    inputPathValueLowerCase: pl,
                    outputPath: outputPath
                };
            }
        },
        clearPathsForRoot: (rootPath) => {
            const indices = new Array<number>();
            items.forEach((i, ii) => {
                const rpl = rootPath.toLowerCase();
                if (i.inputPathValueLowerCase.startsWith(rpl)) {
                    indices.push(ii);
                }
            });

            indices.sort((a, b) => b - a).forEach(i => items.splice(i, 1));
        }
    }
}