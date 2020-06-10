'use strict';

import { JwtToken } from '../oj-oda-chat-jwt-token';

/**
 * Attachment service that uploads files to a given server.
 *
 * @class AttachmentService
 */
export class AttachmentService {

    /**
     * Provides a singleton instance of Attachment Service.
     *
     * @static
     * @returns {AttachmentService}
     */
    public static getInstance() {
        if (!this.instance) {
            this.instance = new AttachmentService();
        }
        return this.instance;
    }

    private static instance: AttachmentService;

    /**
     * Attachment Error codes
     *
     * @static
     */
    public static readonly ERROR = {
        BAD_REQUEST: 400,
        PAYLOAD_TOO_LARGE: 413,
        UNSUPPORTED_MEDIA_TYPE: 415
    };

    /**
     * Maximum file size that is allowed to be uploaded
     *
     * @static
     */
    public static readonly MAX_ALLOWED_FILE_SIZE = 25 * 1024 * 1204;           // Max size 25MB

    private url: string;
    private readonly FILE_SIZE_METADATA_HEADER = 'x-oda-meta-file-size';

    /**
     * Creates an instance of AttachmentService
     */
    private constructor() { }

    /**
     * Sets the server url at which attachments are uploaded
     *
     * @param {string} url
     */
    public setServerUrl(url: string): void {
        this.url = url;
    }

    /**
     * Uploads attachment file to the server
     *
     * @param {File} file
     * @param {JwtToken} [jwtToken]
     * @returns {Promise<any>}
     */
    public uploadAttachment(file: File, jwtToken?: JwtToken): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.url) {
                reject(AttachmentService.ERROR.BAD_REQUEST);
            } else if (file.size > AttachmentService.MAX_ALLOWED_FILE_SIZE) {
                reject(AttachmentService.ERROR.PAYLOAD_TOO_LARGE);
            } else {
                const formData = new FormData();
                const headers = {
                    [this.FILE_SIZE_METADATA_HEADER]: file.size.toString()
                };
                if (jwtToken) {
                    headers['Authorization'] = 'Bearer ' + jwtToken.token;
                }
                formData.append('attachment', file);
                fetch(this.url, {
                    method: 'POST',
                    headers: headers,
                    body: formData
                }).then(response => {
                    if (!response.ok) {
                        reject(response.status);
                    } else {
                        response.json()
                            .then(result => { resolve(result); })
                            .catch(reason => { reject(reason); });
                    }
                }).catch(error => {
                    reject(error);
                });
            }
        });
    }
}
