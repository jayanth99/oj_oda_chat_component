'use strict';

import * as ko from 'knockout';
import { ATTACHMENT_TYPE, PAYLOAD_TYPE, SENDER } from '../oj-oda-chat-enums';
import { Message } from './oj-oda-chat-message-model';

const googleMapBaseUrl = 'https://www.google.com/maps?z=12&t=m&q=loc:';
const mediaTypeMatcher = {
    AUDIO: /audio\/.*/g,
    FILE: /(application|file)\/.*/g,
    IMAGE: /image\/.*/g,
    VIDEO: /video\/.*/g
};

class UserMessage extends Message {
    constructor(type: PAYLOAD_TYPE) {
        super(SENDER.USER, type);
    }
}

class UserAttachmentMessage extends UserMessage {
    public fileType: ATTACHMENT_TYPE;
    public isUploaded: ko.Observable<boolean>;
    public url: ko.Observable<string>;
    public errorMessage: ko.Observable<string>;

    constructor(public name: string, type: ATTACHMENT_TYPE) {
        super(PAYLOAD_TYPE.ATTACHMENT);

        this.fileType = ATTACHMENT_TYPE.FILE;

        if (type.match(mediaTypeMatcher.AUDIO)) {
            this.fileType = ATTACHMENT_TYPE.AUDIO;
        } else if (type.match(mediaTypeMatcher.IMAGE)) {
            this.fileType = ATTACHMENT_TYPE.IMAGE;
        } else if (type.match(mediaTypeMatcher.VIDEO)) {
            this.fileType = ATTACHMENT_TYPE.VIDEO;
        } else if (type.match(mediaTypeMatcher.FILE)) {
            this.fileType = ATTACHMENT_TYPE.FILE;
        }

        this.isUploaded = ko.observable(undefined);

        this.url = ko.observable();

        this.errorMessage = ko.observable('');
    }
}

class UserLocationMessage extends UserMessage {
    public url: string;

    constructor(public latitude: number, public longitude: number) {
        super(PAYLOAD_TYPE.LOCATION);

        this.url = googleMapBaseUrl + latitude + '+' + longitude;
    }
}

class UserTextMessage extends UserMessage {
    constructor(public text: string) {
        super(PAYLOAD_TYPE.TEXT);
    }
}


/**
 * Create user message payload
 *
 * @param {string} userId
 * @param {object} messagePayload
 * @returns user message payload
 */
const createUserPayload = (userId: string, messagePayload: any) => {
    return {
        messagePayload: messagePayload,
        userId: userId
    };
};

/**
 * Create user attachment message payload to send to server
 *
 * @param {string} userId
 * @param {string} type Type of the attachment
 * @param {string} url Server URL of the file
 * @returns
 */
const createUserAttachmentPayload = (userId: string, type: ATTACHMENT_TYPE, url: string) => {
    const messagePayload = {
        attachment: {
            type: type,
            url: url
        },
        type: PAYLOAD_TYPE.ATTACHMENT
    };
    return createUserPayload(userId, messagePayload);
};

/**
 * Create user location message payload to send to server
 *
 * @param {string} userId
 * @param {number} latitude
 * @param {number} longitude
 * @returns {object}
 */
const createUserLocationPayload = (userId: string, latitude: number, longitude: number) => {
    const messagePayload = {
        location: {
            latitude: latitude,
            longitude: longitude
        },
        type: PAYLOAD_TYPE.LOCATION
    };
    return createUserPayload(userId, messagePayload);
};

/**
 * Create user postback message payload to send to server
 *
 * @param {string} userId
 * @param {string} message
 * @returns {object}
 */
const createUserPostbackPayload = (userId: string, message) => {
    const messagePayload = {
        postback: message.postback,
        text: message.label,
        type: message.type
    };
    return createUserPayload(userId, messagePayload);
};

/**
 * Create user text message payload to send to server
 *
 * @param {string} userId
 * @param {string} text
 * @returns {object}
 */
const createUserTextPayload = (userId: string, text: string) => {
    const messagePayload = {
        text: text,
        type: PAYLOAD_TYPE.TEXT
    };
    return createUserPayload(userId, messagePayload);
};

export {
    UserAttachmentMessage,
    UserLocationMessage,
    UserTextMessage,
    createUserAttachmentPayload,
    createUserLocationPayload,
    createUserPostbackPayload,
    createUserTextPayload,
    createUserPayload
};
