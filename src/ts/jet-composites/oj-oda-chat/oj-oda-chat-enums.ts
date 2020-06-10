'use strict';

/**
 * Message payload types
 *
 * @enum {string}
 */
enum PAYLOAD_TYPE {
    ATTACHMENT = 'attachment',
    CARD = 'card',
    ERROR = 'error',
    LOCATION = 'location',
    LOCATION_DENIED = 'location-denied',
    LOCATION_REQUESTED = 'location-requested',
    POSTBACK = 'postback',
    PROFILE = 'profile',
    RAW = 'raw',
    SUGGEST = 'suggest',
    TEXT = 'text'
}

/**
 * Message sender types
 *
 * @enum {string}
 */
enum SENDER {
    BOT = 'bot',
    USER = 'user'
}

/**
 * Message payload action types
 *
 * @enum {string}
 */
enum ACTION_TYPE {
    CALL = 'call',
    LOCATION = 'location',
    POSTBACK = 'postback',
    SHARE = 'share',
    URL = 'url'
}

/**
 * Message payload attachment types
 *
 * @enum {string}
 */
enum ATTACHMENT_TYPE {
    AUDIO = 'audio',
    FILE = 'file',
    IMAGE = 'image',
    VIDEO = 'video'
}

const SUPPORTED_MEDIA_TYPE = {
    AUDIO: ['.aac', '.amr', '.mp3', '.mpga', '.oga', '.ogg', '.wav', 'audio/*'],
    FILE: ['.7z', '.csv', '.doc', '.docx', '.eml', '.ics', '.key', '.log',
        '.neon', '.numbers', '.odt', '.pages', '.pdf', '.pps', '.ppsx',
        '.ppt', '.pptx', '.xls', '.xlsx', '.xml', '.yml', '.yaml', '.txt',
        '.vcf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    IMAGE: ['.gif', '.jfif', '.jpeg',
        '.jpg', '.png', '.webp',
        '.svg', '.tif', '.tiff', 'image/*'],
    VIDEO: ['.3g2', '.3gp', '.avi', '.m4a', '.m4v', '.mov', '.mp4',
        '.mp4a', '.mpeg', '.mpg', '.ogv', '.qt', '.wmv', '.webm', 'video/*']
};

export { PAYLOAD_TYPE, SENDER, ACTION_TYPE, ATTACHMENT_TYPE, SUPPORTED_MEDIA_TYPE };
