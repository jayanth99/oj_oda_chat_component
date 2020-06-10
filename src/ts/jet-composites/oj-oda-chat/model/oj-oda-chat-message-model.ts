'use strict';

import { ACTION_TYPE, ATTACHMENT_TYPE, PAYLOAD_TYPE } from '../oj-oda-chat-enums';

// Message sub components

/**
 * Action component
 *
 * @interface IAction
 */
interface IAction {
    imageUrl?: string;

    label?: string;

    phoneNumber?: string;    // Call actions

    postback?: any;         // Postback action

    type: ACTION_TYPE;

    url?: string;           // Url action
}

/**
 * Attachment component
 *
 * @interface IAttachment
 */
interface IAttachment {
    title?: string;

    type: ATTACHMENT_TYPE;

    url: string;
}

/**
 * Card component
 *
 * @interface ICard
 */
interface ICard {
    actions?: IAction[];

    description?: string;

    imageUrl?: string;

    link?: string;

    title: string;

    url?: string;
}

/**
 * Location component
 *
 * @interface ILocation
 */
interface ILocation {
    latitude: number;

    longitude: number;

    title?: string;

    url?: string;
}

/**
 * Card layouts
 *
 * @enum {number}
 */
enum CardLayout {
    horizontal = 'horizontal',
    vertical = 'vertical'
}



// Message base types

interface IMessagePayload {
    type: PAYLOAD_TYPE;

    [propName: string]: any;
}

interface IRawPayload extends IMessagePayload {
    payload: any;
}

interface INonRawMessagePayload extends IMessagePayload {
    actions?: IAction[];

    globalActions?: IAction[];

    footerText?: string;

    headerText?: string;
}

// Bot Message Types

interface IAttachmentPayload extends INonRawMessagePayload {
    attachment: IAttachment;
}

interface ICardPayload extends INonRawMessagePayload {
    cards: ICard[];

    headerText?: string;

    layout: CardLayout;
}

interface ILocationPayload extends INonRawMessagePayload {
    location: ILocation;
}

interface IPostbackPayload extends INonRawMessagePayload {
    postback: string | {};

    text?: string;
}

interface ITextPayload extends INonRawMessagePayload {
    text: string;
}

interface IUploadedFile {
    fileName: string;
    id: string;
    type: ATTACHMENT_TYPE;
    url: string;
}

class Message implements IMessagePayload {
    constructor(public sender: string, public type: PAYLOAD_TYPE) { }
}

export {
    CardLayout,
    IAction,
    INonRawMessagePayload,
    IAttachment,
    IAttachmentPayload,
    ICard,
    ICardPayload,
    ILocation,
    ILocationPayload,
    IMessagePayload,
    IPostbackPayload,
    IRawPayload,
    ITextPayload,
    IUploadedFile,
    Message
};
