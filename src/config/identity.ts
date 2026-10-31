// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.

/**
 * Single source of truth for the application's identity.
 * To rename the app or change its identifier, edit `identity.json` only:
 * app.config.ts, the desktop build and the UI all read from it.
 */
import identityJson from './identity.json';
import packageJson from '../../package.json';

export const APP_IDENTITY = identityJson;
export const APP_NAME: string = identityJson.name;
export const APP_ID: string = identityJson.appId;
export const APP_AUTHOR: string = identityJson.author;
export const APP_VERSION: string = packageJson.version;
export const APP_LICENSE: string = identityJson.license;
export const APP_REPOSITORY_URL: string = identityJson.repositoryUrl;
export const APP_COPYRIGHT = `© ${identityJson.copyrightYear} ${identityJson.author}`;
