'use strict';

import * as ko from 'knockout';
import * as componentStrings from 'ojL10n!../resources/nls/oj-oda-chat-strings';
import { ATTACHMENT_TYPE, PAYLOAD_TYPE, SENDER } from '../oj-oda-chat-enums';
import {
    CardLayout, IAction, IAttachmentPayload, ICard, ICardPayload,
    ILocationPayload, IMessagePayload, INonRawMessagePayload,
    IRawPayload, ITextPayload, Message
} from './oj-oda-chat-message-model';

const res = componentStrings['oj-oda-chat'];
const googleMapBaseUrl = 'https://www.google.com/maps?z=12&t=m&q=loc:';
const PAUSE = ';';

class BotMessage extends Message {
    public isRead: ko.Observable<boolean>;
    public isDisabled: ko.Observable<boolean>;
    public utterance: string;

    constructor(data: IMessagePayload) {
        super(SENDER.BOT, data.type);

        this.isRead = ko.observable(false);

        this.isDisabled = ko.observable(false);

        this.utterance = '';
    }
}

class BotMessageGeneric extends BotMessage {
    public message: string;

    constructor(type: PAYLOAD_TYPE, message: string) {
        super({ type: type });

        this.message = message;

        this.utterance = this.message + ' ' + this.utterance;
    }
}

class NonRawBotMessage extends BotMessage implements INonRawMessagePayload {
    public actions: IAction[];
    public globalActions: IAction[];
    public footerText: string;
    public headerText: string;

    constructor(data: INonRawMessagePayload) {
        super(data);

        this.headerText = data.headerText;

        this.actions = data.actions || [];

        this.globalActions = data.globalActions || [];

        this.footerText = data.footerText;

        this.setUtterance();
    }

    setUtterance(middleSection?: string) {
        this.utterance = (this.headerText ? this.headerText + PAUSE : '')
            + (middleSection ? middleSection + PAUSE : '')
            + parseActionsUtterance(this.actions)
            + parseActionsUtterance(this.globalActions)
            + (this.footerText ?? '');
    }
}

class BotAttachmentMessage extends NonRawBotMessage {
    public attachmentType: ATTACHMENT_TYPE;
    public attachmentUrl: string;
    public attachmentTitle: string;

    constructor(data: IAttachmentPayload) {
        super(data);

        this.attachmentTitle = data.attachment.title;

        this.attachmentType = data.attachment.type;

        this.attachmentUrl = data.attachment.url;

        this.setUtterance(res[this.type + this.attachmentType]);
    }
}

class BotCardsMessage extends NonRawBotMessage {
    public layout: CardLayout;
    public headerText: string;
    public cards: ICard[];

    constructor(data: ICardPayload) {
        super(data);

        this.layout = data.layout;

        this.headerText = data.headerText;

        this.cards = data.cards;

        this.setUtterance(parseCardsUtterance(data.cards));
    }
}

class BotLocationMessage extends NonRawBotMessage {
    public latitude: number;
    public longitude: number;
    public title: string;
    public url: string;

    constructor(data: ILocationPayload) {
        super(data);

        const location = data.location;

        this.latitude = location.latitude;

        this.longitude = location.longitude;

        this.title = location.title;

        this.url = location.url || googleMapBaseUrl + this.latitude + '+' + this.longitude;;

        this.setUtterance((this.title ? this.title + PAUSE : '') + res.openMap);
    }
}

class BotRawMessage extends NonRawBotMessage {
    public payload: any;

    constructor(data: IRawPayload) {
        super(data);

        this.payload = JSON.stringify(data.payload);

        this.utterance = res.rawMessage;
    }
}

class BotTextMessage extends NonRawBotMessage {
    public text: string;

    constructor(data: ITextPayload) {
        super(data);

        this.text = data.text;

        this.setUtterance(this.text);
    }
}

class BotLocationDeniedMessage extends BotMessageGeneric {
    constructor(message: string) {
        super(PAYLOAD_TYPE.LOCATION_DENIED, message);
    }
}

class BotLocationRequestMessage extends BotMessageGeneric {
    constructor(message: string) {
        super(PAYLOAD_TYPE.LOCATION_REQUESTED, message);
    }
}

const parseActionsUtterance = (actionArray: IAction[]): string => {
    let utterance = '';
    if (actionArray) {
        actionArray.forEach((action) => {
            if (action.label) {
                utterance = utterance.concat(action.label).concat(PAUSE);
            }
        });
    }
    return utterance;
};

const parseCardsUtterance = (cardArray: ICard[]): string => {
    let utterance = '';
    if (cardArray) {
        cardArray.forEach((card, index) => {
            utterance = utterance.concat(res.card + ' ' + (index + 1)).concat(PAUSE);
            if (card.title) {
                utterance = utterance.concat(card.title).concat(PAUSE);
            }
            if (card.description) {
                utterance = utterance.concat(card.description).concat(PAUSE);
            }
            if (card.actions) {
                utterance = utterance.concat(parseActionsUtterance(card.actions));
            }
        });
    }
    return utterance;
};

const parseBotMessage = (data: IMessagePayload): BotMessage => {
    switch (data.type) {
        case PAYLOAD_TYPE.TEXT:
            return new BotTextMessage(data as ITextPayload);
        case PAYLOAD_TYPE.CARD:
            return new BotCardsMessage(data as ICardPayload);
        case PAYLOAD_TYPE.ATTACHMENT:
            return new BotAttachmentMessage(data as IAttachmentPayload);
        case PAYLOAD_TYPE.LOCATION:
            return new BotLocationMessage(data as ILocationPayload);
        case PAYLOAD_TYPE.RAW:
            if (data.payload.type) {
                return parseBotMessage(data.payload);
            } else if (data?.payload?.messagePayload?.type) {
                return parseBotMessage(data.payload.messagePayload);
            } else {
                return new BotRawMessage(data as IRawPayload);
            }
    }
};

export { BotLocationDeniedMessage, BotLocationRequestMessage, parseBotMessage };
