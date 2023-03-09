export class AssetNameParser {
    public static parseFullFileName(fullName: string | { readonly title: string, readonly extension: string }, hash: string): {
        readonly normalizedTitle: string;
        readonly normalizedExtension: string;
        readonly publicName: string;
    } {
        let titleInput = '';
        let extensionInput = '';

        if (typeof fullName === 'string') {
            const lastDot = fullName.lastIndexOf('.');
            if (lastDot > -1) {
                titleInput = fullName.substring(0, lastDot);
                extensionInput = fullName.substring(lastDot + 1);
            } else {
                titleInput = fullName;
                extensionInput = '';
            }
        } else {
            titleInput = fullName.title;
            extensionInput = fullName.extension;
        }

        let publicName = '';
        publicName += titleInput;
        if (!!extensionInput) {
            publicName += `.${extensionInput}`;
        }

        return {
            normalizedTitle: titleInput.toLowerCase(),
            normalizedExtension: extensionInput.toLowerCase(),
            publicName: publicName//rawName.replace('$$', '')
        }
    }

    public static parseFullDirName(fullName: string): string {
        if (AssetNameParser.validateName(fullName)) {
            return fullName;
        } else {
            throw new Error('Invalid name');
        }
    }

    public static validateName(name: string): boolean {
        return !name.includes('$$') && !name.includes('//') && /^[\u0020-\uFFFF]+$/.test(name);
    }

    public static joinPath(...parts: Array<string>): string {
        const segments = new Array<string>();
        parts.forEach(pt => pt.split('/').map(p => p.trim()).filter(p => !!p).forEach(p => segments.push(p)));

        if (segments.some(segment => !AssetNameParser.validateName(segment))) {
            // throw new Error('Invalid path');
            return '';
        } else {
            let joinedPath = segments.join('/');
            if (!joinedPath.startsWith('/')) {
                joinedPath = `/${joinedPath}`;
            }
            return joinedPath;
            // return '/' + segments.join('/');
        }
    }

    public static joinFileNameParts(title: string, extension: string): string {
        let publicName = '';

        publicName += title;
        if (!!extension) {
            publicName += `.${extension}`;
        }

        return publicName;
    }

    public static validatePathQuery(pathQuery: string): boolean {
        const globsAfterAny = !!pathQuery.match(/\*\/([\u0000-\uFFFF]+\/){0,}\*\*\//);
        const tooManyAsterisks = !!pathQuery.match(/\/[\*]{3,}\//);
        
        return !globsAfterAny && !tooManyAsterisks;
    }

    public static isPathQueryMatch(pathQuery: string, candidatePath: string): boolean {
        if (AssetNameParser.validatePathQuery(pathQuery)) {
            const queryParts = pathQuery.split('/').map(pp => pp.trim().toLowerCase()).filter(pp => !!pp);
            const candidatePathParts = candidatePath.split('/').map(pp => pp.trim().toLowerCase()).filter(pp => !!pp);

            let isNonMatch = false;
            // /abc/*/def/gh
            // /abc/123
            for (let i = 0; i < queryParts.length && !isNonMatch; i++) {
                if (i >= candidatePathParts.length) {
                    isNonMatch = true;
                } else {
                    const queryPart = queryParts[i];
                    const candidatePathPart = candidatePathParts[i];

                    if (queryPart === '*') {
                        isNonMatch = (i + 1) < candidatePathParts.length;
                    } else if (queryPart !== '**') {
                        isNonMatch = queryPart !== candidatePathPart;
                    }
                }
            }

            return !isNonMatch;
        } else {
            throw new Error('Invalid path query');
        }
    }
}