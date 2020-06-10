'use strict';

export enum STATE_TYPE {
    AUTH = 'auth',
    PING = 'ping',
    PONG = 'pong'
}

export enum TOKEN_TYPE {
    JWT = 'jwt'
}

export const buildPingMessage = () => {
    return {
        state: {
            type: STATE_TYPE.PING
        }
    };
};

export const buildAuthTokenMessage = (tokenType: TOKEN_TYPE, token: string) => {
    const message = {
        state: {
            token: token,
            tokenType: tokenType,
            type: STATE_TYPE.AUTH
        }
    };
    return message;
};

export const isPongMessage = (message) => {
    return message?.state?.type === STATE_TYPE.PONG;
};

export const generateUserId = () => {
    return 'user' + Math.random().toString(36).substr(2, 9) + (Date.now() % 10000);
};

export const isUnspecified = (object: any) => {
    return typeof object === undefined || object === null;
};
