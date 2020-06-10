/**
 * Copyright (c) 2020, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */

'use strict';

import * as ko from 'knockout';
import * as componentStrings from 'ojL10n!./resources/nls/oj-oda-chat-strings';
import Context = require('ojs/ojcontext');
import Composite = require('ojs/ojcomposite');
import 'ojs/ojknockout';
import 'ojs/ojpopup';
import { ojPopup, ojPopupEventMap } from 'ojs/ojpopup';
import * as AnimationUtils from 'ojs/ojanimation';
//To typecheck the element APIs, import as below.
import {ojMenu} from "ojs/ojmenu";

//For the transpiled javascript to load the element's module, import as below
import "ojs/ojmenu";

//To typecheck the element APIs, import as below.
import {ojInputText} from "ojs/ojinputtext";

//For the transpiled javascript to load the element's module, import as below
import "ojs/ojinputtext";

import "ojs/ojarraydataprovider";
import {ojListView} from "ojs/ojlistview";
import "ojs/ojlistview";
import "ojs/ojlabel";
import "ojs/ojcheckboxset";

import * as Bootstrap from 'ojs/ojbootstrap';
import { ojMenuEventMap } from 'ojs/ojmenu';
import 'ojs/ojmenu';
import 'ojs/ojbutton';
import 'ojs/ojoption'; 
import 'ojs/ojfilepicker';


import 'ojs/ojbutton';
import 'ojs/ojfilmstrip';
import 'ojs/ojinputtext';
import 'ojs/ojprogress';

import { AttachmentService } from './services/oj-oda-chat-attachment-service';
import { AuthTokenService } from './services/oj-oda-chat-auth-token-service';
import { ChatService } from './services/oj-oda-chat-service';
import { SpeechRecognitionService } from './services/oj-oda-chat-speech-recognition-service';
import { SpeechSynthesisService } from './services/oj-oda-chat-speech-synthesis-service';

import { BotLocationDeniedMessage, BotLocationRequestMessage, parseBotMessage } from './model/oj-oda-chat-bot-message-model';
import { IUploadedFile, IMessagePayload } from './model/oj-oda-chat-message-model';
import {
    UserAttachmentMessage, UserLocationMessage, UserTextMessage,
    createUserAttachmentPayload, createUserLocationPayload,
    createUserPostbackPayload, createUserTextPayload, createUserPayload
} from './model/oj-oda-chat-user-message-model';

import { ACTION_TYPE, ATTACHMENT_TYPE, PAYLOAD_TYPE, SENDER, SUPPORTED_MEDIA_TYPE } from './oj-oda-chat-enums';
import { generateUserId } from './oj-oda-chat-utils';
import { JwtToken } from './oj-oda-chat-jwt-token';

export default class ViewModel implements Composite.ViewModel<Composite.PropertiesType> {
    busyResolve: (() => void);
    composite: Element;
    messageText: ko.Observable<string>;
    properties: Composite.PropertiesType;
    res: { [key: string]: string; };
    supportedMediaTypes: string;
    ENUMS: {};

    // Bindings
    public title = ko.observable();
    public themeColor = ko.observable();

    public isConnected = ko.observable(false);
    public connectionStatus = ko.observable();

    public isAttachment = ko.observable();
    public isErasable = ko.observable();
    public isCollapsible = ko.observable();
    public isDisplayStatus = ko.observable();
    public isSpeech = ko.observable();
    public isSpeechActive = ko.observable();
    public isSpeechRunning = ko.observable();
    public isUtterance = ko.observable();
    public isTtsActive = ko.observable();
    public isUserInteractive = ko.observable();

    public messages = ko.observableArray([]);
    public isWaitingForResponse = ko.observable(false);
    public unseenMessageCount = ko.observable(0);
    public userInputText = ko.observable();
    public userInputTextRaw = ko.observable();

    // Services
    private _attachmentService: AttachmentService;
    private _authTokenService: AuthTokenService;
    private _chatService: ChatService;
    private _speechSynthesisService: SpeechSynthesisService;
    private _speechRecognitionService: SpeechRecognitionService;

    // Constants
    private readonly SCROLL_TIMEOUT = 300;
    private readonly WAITING_RESPONSE_INDICATOR_TIMEOUT = 10000;

    // flags
    private _isLocationRequest = false;
    private _isFirstRun = true;

    // Configuration
    private config;
    private loadingBubbleId: number;
    private _messageSeenObserver: IntersectionObserver;

    // DOM Elements
    private _chatButton: HTMLElement;
    private _chatWidget: HTMLElement;
    private _chatHeader: HTMLElement;
    private _chatConversation: HTMLElement;
    private _chatFooter: HTMLElement;
    private _chatInput: HTMLElement;
    private _chatUpload: HTMLElement;
    private _addAttachment: HTMLElement;

    constructor(context: Composite.ViewModelContext<Composite.PropertiesType>) {
        const elementContext: Context = Context.getContext(context.element);
        const busyContext: Context.BusyContext = elementContext.getBusyContext();
        const options = { 'description': 'Web Component Startup - Waiting for data' };
        this.busyResolve = busyContext.addBusyState(options);

        this.composite = context.element;
        this.properties = context.properties;
        this.res = componentStrings['oj-oda-chat'];
        this.supportedMediaTypes = Object.keys(SUPPORTED_MEDIA_TYPE).map((key) => SUPPORTED_MEDIA_TYPE[key]).toString();
        this.ENUMS = {
            'ACTION_TYPE': ACTION_TYPE,
            'ATTACHMENT_TYPE': ATTACHMENT_TYPE,
            'PAYLOAD_TYPE': PAYLOAD_TYPE,
            'SENDER': SENDER
        };
        this.messages.subscribe(this._scrollToBottom, null, 'arrayChange');
        this.unseenMessageCount.subscribe((val) => {
            this.properties.unseenCount = val;
        }, null, 'change');

        this.busyResolve();
    }

    // UI Callbacks

    public onClickChatButton = () => {
        this.properties.expand = true;
        return true;
    };

    public onClickClear = () => {
        this.messages.removeAll();
        this._textToSpeechCancel();
        return true;
    };

    public onClickUtterance = () => {
        if (this.isUtterance()) {
            const flag = !this.isTtsActive();
            if (flag) {
                this._textToSpeechResume();
            } else {
                this._textToSpeechCancel();
            }
            this.isTtsActive(flag);
        }
        return true;
    };

    public onClickClose = () => {
        if (this.properties.expand) {
            this._textToSpeechCancel();
            this.properties.expand = false;
        }
        return true;
    };

    public onClickAction = (parent, action) => {
        if (!parent.isDisabled()) {
            switch (action.type) {
                case ACTION_TYPE.CALL:
                    window.open('tel:' + action.phoneNumber, '_blank');
                    break;
                case ACTION_TYPE.LOCATION:
                    // Set a token indicating location is requested
                    // If user sends a text response while location is fetched, reset the token and discard location
                    this._isLocationRequest = true;
                    this._sendUserLocationMessage();
                    break;
                case ACTION_TYPE.POSTBACK:
                    const payload = this._getDelegatedMessage(
                        this.properties.delegate?.beforePostbackSend,
                        createUserPostbackPayload(this.config.userId, action));
                    this.messages.push(new UserTextMessage(action.label));
                    this._chatServiceSendMessage(payload);
                    break;
                case ACTION_TYPE.SHARE:
                    // TODO: If shareable, share on host platform
                    // else copy to the clipboard
                    if (navigator['share']) {
                        navigator['share']({
                        }).then(() => {
                            this.messages.push(new UserTextMessage(this.res.shareComplete));
                        }).catch(() => {
                            this.messages.push(new UserTextMessage(this.res.shareIncompplete));
                        });
                    } else {
                        this.messages.push(new UserTextMessage(this.res.shareUnsupported));
                    }
                    break;
                case ACTION_TYPE.URL:
                    window.open(action.url, '_blank');
                    break;
            }
            parent.isDisabled(true);
            this._textToSpeechCancel();
        }
        return true;
    };

    public onClickAttach = () => {
        this._chatUpload.click();
        this._textToSpeechCancel();
        return true;
    };


    /*
    //For Keeping track of files that have been uploaded
  
    public fileNames = ko.observableArray([]);
  
    // Activated whenever a file is uploaded

    public selectListener = function (event) {
        this.invalidMessage('');
        var files = event.detail.files;
        for (var i = 0; i < files.length; i++) {
            this.fileNames.push(files[i].name);
        }
    }.bind(this);
    public disabled = ko.observableArray();

    public isDisabled = ko.pureComputed(function () {
        return this.disabled()[0] === 'disable' ? true : false;
    }.bind(this));
    // String to display invalid message

    public invalidMessage = ko.observable('');

    // activated whenever user uploads file of different type 

    public invalidListener = function(event) {
        this.fileNames([]);
        this.invalidMessage("{severity: '" + event.detail.messages[0].severity + "', summary: '" + event.detail.messages[0].summary + "'}");
        var promise = event.detail.until;
        if (promise) {
            promise.then(function(){
                            this.invalidMessage('');
                        }.bind(this));
        }
    }.bind(this);
    // Starts required Animation for popup

    public startAnimationListener = (event: ojPopupEventMap['ojAnimateStart']) => {
        let ui = event.detail;
        if ((event.target as ojPopup).id !== 'popup1') { return; }

        if (ui.action === 'open') {
            event.preventDefault();
            let options = { direction: 'top' };
            AnimationUtils.slideIn(ui.element, options).then(ui.endCallback);
        } else if (ui.action === 'close') {
            event.preventDefault();
            ui.endCallback();
        }
    };

    // opens file picker to upload files of image type

    public imageHandler() {
        let popup = document.getElementById('popupImage') as ojPopup;
        popup.open('#btnImage');
    }
    
    // opens file picker to upload files of video type
    
    public videoHandler() {
        let popup = document.getElementById('popupVideo') as ojPopup;
        popup.open('#btnVideo');
    }

    // opens file picker to upload files of audio type
    
    public audioHandler() {
        let popup = document.getElementById('popupAudio') as ojPopup;
        popup.open('#btnAudio');
    }

    // opens file picker to upload files of other types which are not image, audio or video
    
    public fileHandler() {
        let popup = document.getElementById('popupFile') as ojPopup;
        popup.open('#btnFile');
    }
*/
    




    // my code begins //

    // Listens for button click to open popUp to upload different file types

    public openListener() {
        let popup = document.getElementById('popup1') as ojPopup;
        popup.open('#btnGo');
    };
      

    // Whenever user press "Cancel" button, this is activated to close the popup

    public cancelListener() {
        let popup = document.getElementById('popup1') as ojPopup;
        popup.close();
    };

    /**
     * Callback for clicking Share location button
     * Sets a token indicating location is requested
     *
     */
    
    public getPosition = () => {
        
        this._isLocationRequest = true;
        this._sendUserLocationMessage();
    }

    // Specifying acceptable types for images

    public acceptStr1 = ko.observable('image/*');
    public acceptArr1 = ko.pureComputed(function () {
        var accept = this.acceptStr1();
        return accept ? accept.split(',') : [];
    }.bind(this));

    // Specifying acceptable types for videos

    public acceptStr2 = ko.observable('video/*');
    public acceptArr2 = ko.pureComputed(function () {
        var accept = this.acceptStr2();
        return accept ? accept.split(',') : [];
    }.bind(this));

    // Specifying acceptable types for audios

    public acceptStr3 = ko.observable('audio/*');
    public acceptArr3 = ko.pureComputed(function () {
        var accept = this.acceptStr3();
        return accept ? accept.split(',') : [];
    }.bind(this));

    // Specifying acceptable types for other types (i.e. except image or video or audio) of files

    acceptArr4= ['.7z', '.csv', '.doc', '.docx', '.eml', '.ics', '.key', '.log',
                '.neon', '.numbers', '.odt', '.pages', '.pdf', '.pps', '.ppsx',
                '.ppt', '.pptx', '.xls', '.xlsx', '.xml', '.yml', '.yaml', '.txt',
                '.vcf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    

    /**
     * Callback for clicking file upload button
     * Displays user message indicating file upload progress and calls
     * sendAttachment API to upload selected file.
     * On success, the uploaded status is set true.
     * On failure, an error message is shown
     *
     * @param {object} data
     * @param {Event} event
     */
    public onFileUpload = (event) => {
        
        if (event?.detail?.files?.length > 0) {
            const file = event.detail.files[0];
            const attachmentMessage = new UserAttachmentMessage(file.name, file.type);
            this.messages.push(attachmentMessage);

            this._sendAttachment(file)
                .then((result) => {
                    attachmentMessage.isUploaded(true);
                    attachmentMessage.url(result.url);
                })
                .catch((errorCode) => {
                    attachmentMessage.isUploaded(false);
                    switch (errorCode) {
                        case AttachmentService.ERROR.BAD_REQUEST:
                            attachmentMessage.errorMessage(this.res.uploadFailed);
                            break;
                        case AttachmentService.ERROR.PAYLOAD_TOO_LARGE:
                            attachmentMessage.errorMessage(this.res.uploadFileSizeLimitExceeded);
                            break;
                        case AttachmentService.ERROR.UNSUPPORTED_MEDIA_TYPE:
                            attachmentMessage.errorMessage(this.res.uploadUnsupportedFileType);
                            break;
                    }
                });
            event.target.value = '';
        }
    };

    // my code ends //



    /*
    public onFileUpload = function (event) {
        if (event?.target?.files?.length > 0) {
            const file = event.target.files[0];
            const attachmentMessage = new UserAttachmentMessage(file.name, file.type);
            this.messages.push(attachmentMessage);

            this._sendAttachment(file)
                .then((result) => {
                    attachmentMessage.isUploaded(true);
                    attachmentMessage.url(result.url);
                })
                .catch((errorCode) => {
                    attachmentMessage.isUploaded(false);
                    switch (errorCode) {
                        case AttachmentService.ERROR.BAD_REQUEST:
                            attachmentMessage.errorMessage(this.res.uploadFailed);
                            break;
                        case AttachmentService.ERROR.PAYLOAD_TOO_LARGE:
                            attachmentMessage.errorMessage(this.res.uploadFileSizeLimitExceeded);
                            break;
                        case AttachmentService.ERROR.UNSUPPORTED_MEDIA_TYPE:
                            attachmentMessage.errorMessage(this.res.uploadUnsupportedFileType);
                            break;
                    }
                });
            event.target.value = '';
        }
    }.bind(this);*/

    public onClickSpeech = () => {
        if (this.isSpeechRunning()) {
            this._stopSpeechRecognition();
        } else {
            this._startSpeechRecognition();
        }
    };

    public onClickSend = () => {
        if (this._isLocationRequest) {
            this.messages.pop();
            this._isLocationRequest = false;
        }
        this._sendUserTextMessage();
        this._textToSpeechCancel();
        return true;
    };

    public onTextInputChange = (event: KeyboardEvent) => {
        if ((event.code === 'Enter' || event.keyCode === 13) && this.isConnected()) {
            this.onClickSend();
            event.preventDefault();
        }
    };

    /**
     * Returns if an object is empty
     *
     * @param {*} obj
     * @returns {boolean}
     */
    public isEmpty = (obj: any): boolean => {
        return obj === undefined || obj === null || Object.keys(obj).length === 0 && obj.constructor === Object;
    };

    // Component Configuration

    /**
     * Initialize component without starting any connection services
     *
     * @private
     */
    private _initializeComponent() {
        // Map properties to a config object. This ensures that if public
        // properties are changed, it doesn't affect internal namings.
        this.config = {
            // Feature flags
            isAttachment: this.properties.displayOptions.attachment,
            isCollapsible: true,
            isErasable: this.properties.displayOptions.erasable,
            isDisplayStatus: this.properties.displayOptions.connectionStatus,
            isSpeech: this.properties.displayOptions.speech,
            isUtterance: this.properties.displayOptions.utterBotMessage,
            isTtsActive: false,

            // Functionality
            initUserMessage: this.properties.initMessage,

            // UI config
            title: this.properties.chatTitle ?? '',
            color: {
                theme: this.properties.displayOptions.colorTheme
            }
        };

        // Initialize all bindings
        this.title(this.config.title);
        this.isAttachment(this.config.isAttachment);
        this.isCollapsible(this.config.isCollapsible);
        this.isErasable(this.config.isErasable);
        this.isDisplayStatus(this.config.isDisplayStatus);
        this.isSpeech(this.config.isSpeech);
        this.isUtterance(this.config.isUtterance);
        this.isTtsActive(this.config.isTtsActive);
        this.isUserInteractive(true);
        this.isWaitingForResponse(false);
        this.themeColor(this.config.color.theme);

        this._chatInput.addEventListener('keyup', this.onTextInputChange);

        this._toggleComponent(this.properties.expand);
        if (this.properties.expand) {
            this._chatButton.classList.add('oj-oda-chat-none');
        } else {
            this._chatWidget.classList.add('oj-oda-chat-none');
        }

        // Set up theme color classes
        if (this.config.color.theme) {
            this._setupThemeClasses();
        }

        // Set up message seen observer
        this._setupMessageIntersectionObserver();

        // Set up speech synthesis service
        if (this.isUtterance()) {
            this._setupSpeechSynthesis();
        }
    }

    /**
     * Start network connection related services
     *
     * @private
     */
    private _startServices() {
        const connectionConfig = {
            uri: this.properties.uri,
            generateAuthToken: this.properties.tokenGenerator,
            channelId: this.properties.tokenGenerator ? undefined : this.properties.channelId,
            userId: this.properties.tokenGenerator ? undefined : (this.properties.userId || generateUserId()),
            isSsl: true
        };
        this.config = { ...this.config, ...connectionConfig };

        // Start auth token service if token generator provided
        if (this.config.generateAuthToken) {
            this._authTokenService = AuthTokenService.getInstance();
            this._authTokenService.setFetchTokenMethod(this.config.generateAuthToken);
        }

        // Connect to server
        this._setupChatServerService();

        // Set up attachment service
        if (this.isAttachment()) {
            this._setupAttachmentService();
            this._chatUpload = this._htmlQuerySelector(this._chatFooter, '.oj-oda-chat-file-upload');
        }

        // Set up speech recognition service
        if (this.isSpeech()) {
            this._setupSpeechRecognitionService();
        }
    }

    // Chat server service handling methods

    /**
     * Connects the client to Chat Server using WebSocket
     *
     * @private
     * @returns {Promise<any>} Promise that is resolved for a successful connection and rejected for failed connection
     */
    private _setupChatServerService(): Promise<any> {
        let chatUrl;
        this._chatServiceOnStatusChange(WebSocket.CONNECTING);
        if (this._authTokenService) {
            this._authTokenService.getToken().then((jwtToken) => {
                try {
                    this._setParameters(jwtToken);
                    chatUrl = this._buildChatServerUrl(this.config.uri, this.config.channelId, this.config.userId, this.config.isSsl);
                } catch (error) {
                    this._chatServiceOnStatusChange(WebSocket.CLOSED);
                    return Promise.reject(error);
                }
                return this._startChatServerService(chatUrl, this._authTokenService);
            }).catch((reason) => {
                return Promise.reject(reason);
            });
        } else {
            try {
                chatUrl = this._buildChatServerUrl(this.config.uri, this.config.channelId, this.config.userId, this.config.isSsl);
            } catch (error) {
                this._chatServiceOnStatusChange(WebSocket.CLOSED);
                return Promise.reject(error);
            }
            return this._startChatServerService(chatUrl);
        }
    }

    /**
     * Set up chat server service
     *
     * @private
     * @param {string} url Chat server URL to connect
     * @param {AuthTokenService} [authTokenService] Authentication service
     * @returns {Promise<any>} Promise that is resolved on successful connection, rejected on unsuccessful connection
     */
    private _startChatServerService(url: string, authTokenService?: AuthTokenService): Promise<any> {
        if (this.isConnected()) {
            this._disconnect();
        }
        return new Promise((resolve, reject) => {
            this._chatService = new ChatService(url, [], authTokenService);

            this._chatService.onopen = () => {
                if (this._isFirstRun && this.config.initUserMessage) {
                    const payload = createUserTextPayload(this.config.userId, this.config.initUserMessage);
                    this._chatServiceSendMessage(payload);
                }
                this._isFirstRun = false;
                resolve();
            };

            this._chatService.onclose = () => {
                // Disable footer buttons on close
                // If closed in first run, reject promise
                if (this._isFirstRun) {
                    this._isFirstRun = false;
                    reject();
                }
            };

            this._chatService.onmessage = this._chatServiceReceiveMessage.bind(this);

            this._chatService.onerror = () => {
                // Disable footer buttons on close
                // If closed in first run, reject promise
                if (this._isFirstRun) {
                    this._isFirstRun = false;
                    reject();
                }
            };

            this._chatService.onstatuschange = this._chatServiceOnStatusChange.bind(this);
        });
    }

    /**
     * Builds chat server WebSocket URL for connection
     *
     * @private
     * @param {string} uri Server URI (without protocol, https://)
     * @param {string} channelId Web Channel Id
     * @param {string} userId User Id
     * @param {boolean} [isSsl] Whether use SSL to connect or have insecure connection (wss:// vs ws://)
     * @returns {string} WebSocket URL
     */
    private _buildChatServerUrl(uri: string, channelId: string, userId: string, isSsl: boolean): string {
        if (!uri) {
            throw new Error('Can not connect to server as "uri" property has not been set.');
        } else if (!channelId) {
            throw new Error('Can not connect to server as "channel-id" property has not been set.');
        } else if (!userId) {
            throw new Error('Can not connect to server as "user-id" property has not been set.');
        }
        const protocol = isSsl ? 'wss://' : 'ws://';
        const url = new URL(protocol + uri + '/chat/v1/chats/sockets/websdk');
        const urlQueryString = url.search;
        const searchParams = new URLSearchParams(urlQueryString);
        searchParams.set('channelId', channelId);
        searchParams.set('userId', userId);
        url.search = searchParams.toString();
        return url.toString();
    }

    private _stopChatServerService() {
        if (this._chatService && this.isConnected()) {
            this._chatService.close();
        }
    }

    /**
     * Called to send a message to chat server.
     *
     * @private
     * @param {*} payload
     */
    private _chatServiceSendMessage(payload: any): Promise<void> {
        this.isWaitingForResponse(true);
        this._trackWaitingBubbleForRemoval();
        this._scrollToBottom();
        return new Promise((resolve, reject) => {
            if (this._chatService.send(JSON.stringify(payload))) {
                resolve();
                this.dispatchMessageEvent('chatMessageSend', payload);
            } else {
                reject();
            }
        });
    }

    /**
     * Callback which is called on receiving a new message from chat server
     *
     * @private
     * @param {*} payload
     */
    private _chatServiceReceiveMessage(payload: any) {
        this.dispatchMessageEvent('chatMessageReceived', payload);
        this.isWaitingForResponse(false);
        this._cancelWaitingBubbleForRemoval();
        payload = this._getDelegatedMessage(this.properties.delegate?.beforeDisplay, payload);
        const message = parseBotMessage(payload.messagePayload);
        this.messages.push(message);
        if (!this.properties.expand) {
            this.unseenMessageCount(this.unseenMessageCount() + 1);
            this._messageSeenObserver.observe(document.querySelector('#oj-oda-chat-message-' + (this.messages().length - 1)));
        }
        this._textToSpeechSpeak(message.utterance);
    }

    /**
     * Callback which is called whenever the connection to chat server is modified
     *
     * @private
     * @param {number} status Connection status in WebSocket connection notation
     */
    private _chatServiceOnStatusChange(status: number) {
        this.isConnected(status === WebSocket.OPEN);
        if (!this.isConnected()) {
            this.isWaitingForResponse(false);
            this._cancelWaitingBubbleForRemoval();
        }
        let connectionStatus: string;
        switch (status) {
            case WebSocket.OPEN:
                connectionStatus = this.res.connected;
                this.properties.networkStatus = 'OPEN';
                break;
            case WebSocket.CLOSED:
                connectionStatus = this.res.closed;
                this.properties.networkStatus = 'CLOSED';
                break;
            case WebSocket.CONNECTING:
                connectionStatus = this.res.connecting;
                this.properties.networkStatus = 'CONNECTING';
                break;
            case WebSocket.CLOSING:
                connectionStatus = this.res.closing;
                this.properties.networkStatus = 'CLOSING';
                break;
        }
        this.connectionStatus(connectionStatus);
    }

    // Attachment service handler methods

    /**
     * Starts attachment service and configures server URL
     *
     * @private
     */
    private _setupAttachmentService() {
        this._attachmentService = AttachmentService.getInstance();
        let serverUrl;
        if (this._authTokenService) {
            this._authTokenService.getToken()
                .then((jwtToken) => {
                    this._setParameters(jwtToken);
                    serverUrl = this._buildAttachmentServerUrl(this.config.uri, this.config.channelId, this.config.userId, this.config.isSsl);
                    this._attachmentService.setServerUrl(serverUrl);
                }).catch((reason) => {
                    throw (reason);
                });
        } else {
            serverUrl = this._buildAttachmentServerUrl(this.config.uri, this.config.channelId, this.config.userId, this.config.isSsl);
            this._attachmentService.setServerUrl(serverUrl);
        }
    }

    /**
     * Uploads a file to server with Attachment service.
     * On successful upload, sends upload information to chat server.
     *
     * @private
     * @param {File} file File to be uploaded
     * @returns {Promise<any>} Promise that is resolved for a successful upload and rejected with a numerical code for failed upload
     */
    private _sendAttachment(file: File): Promise<any> {
        if (!this._attachmentService) {
            return Promise.reject('Attachment service not available. Make sure you have enabled attachment.');
        }
        return new Promise((resolve, reject) => {
            if (file.size <= AttachmentService.MAX_ALLOWED_FILE_SIZE) {
                if (this._authTokenService) {
                    this._authTokenService.getToken()
                        .then((jwtToken) => {
                            this._uploadAttachment(file, jwtToken)
                                .then((result) => resolve(result))
                                .catch((reason) => reject(reason));
                        }).catch((reason) => {
                            reject(reason);
                        });
                } else {
                    this._uploadAttachment(file)
                        .then((result) => resolve(result))
                        .catch((reason) => reject(reason));
                }
            } else {
                reject(AttachmentService.ERROR.PAYLOAD_TOO_LARGE);
            }
        });
    }

    /**
     * Helper function that initiates the uploading process
     *
     * @private
     * @param {File} file File to upload
     * @param {JwtToken} [token] Signed JWT token
     * @returns {Promise<any>} Promise which is resolved on successful upload
     */
    private _uploadAttachment(file: File, token?: JwtToken): Promise<any> {
        const uploadPromise = this._attachmentService.uploadAttachment(file, token);
        uploadPromise.then((result: IUploadedFile) => {
            this._sendUserAttachmentMessage(result);
        });
        return uploadPromise;
    }

    /**
     * Builds attachment server URL for connection
     *
     * @private
     * @param {string} uri Server URI (without protocol, https://)
     * @param {string} channelId Web Channel Id
     * @param {string} userId User Id
     * @param {boolean} [isSsl] Whether use SSL to connect or have insecure connection (wss:// vs ws://)
     * @returns {string} Attachment server URL
     */
    private _buildAttachmentServerUrl(uri: string, channelId: string, userId: string, isSsl: boolean): string {
        if (!uri) {
            throw new Error('Can not connect to server as "uri" property has not been set.');
        } else if (!channelId) {
            throw new Error('Can not connect to server as "channel-id" property has not been set.');
        } else if (!userId) {
            throw new Error('Can not connect to server as "user-id" property has not been set.');
        }
        const protocol = isSsl ? 'https://' : 'http://';
        const url = new URL(protocol + uri + '/chat/v1/attachments');
        const urlQueryString = url.search;
        const searchParams = new URLSearchParams(urlQueryString);
        searchParams.set('channelId', channelId);
        searchParams.set('userId', userId);
        url.search = searchParams.toString();
        return url.toString();
    }

    // Speech recognition service handler methods

    /**
     * Set up speech recognition service
     *
     * @private
     */
    private _setupSpeechRecognitionService() {
        this._speechRecognitionService = SpeechRecognitionService.getInstance();
        this.userInputTextRaw.subscribe((value) => {
            if (this.isSpeech && !this.isSpeechRunning()) {
                this.isSpeechActive(value.trim().length === 0);
            }
        });
        try {
            this._speechRecognitionService.init({
                host: this.config.uri,
                channelId: this.config.channelId,
                protocol: this.config.isSsl ? 'wss://' : 'ws://',
                userId: this.config.userId,
            }, this._authTokenService).then(() => {
                this.isSpeechActive(true);
                this.isSpeechRunning(false);
            });
        } catch (error) {
            if (error?.message) {
                console.log(error.message);
            } else {
                console.log(error);
            }
        }
    }

    /**
     * Starts audio recording for speech recognition
     *
     * @private
     */
    private _startSpeechRecognition() {
        if (this.isSpeech()) {
            this._speechRecognitionService.startRecording(this._onSpeechRecognition, this._onSpeechNetworkChange)
                .then(() => {
                    this.isSpeechRunning(true);
                    this.isUserInteractive(false);
                }).catch((error: Error) => {
                    console.error(error.message);
                    this.isSpeechRunning(false);
                    this.isUserInteractive(true);
                });
        }
    }

    /**
     * Stops any running speech recognition
     *
     * @private
     */
    private _stopSpeechRecognition() {
        if (this.isSpeech()) {
            this._speechRecognitionService.stopRecording();
            this.isSpeechRunning(false);
            this.isUserInteractive(true);
        }
    }

    /**
     * Callback called on getting speech recognition response from Speech server
     *
     * @param {*} data
     */
    private _onSpeechRecognition = (data: any) => {
        if (data) {
            switch (data.event) {
                case 'finalResult':
                    if (data?.nbest?.length > 0) {
                        const utterance = data.nbest[0].utterance;
                        if (utterance.length > 0) {
                            this.userInputText('');
                            this._sendUserTextMessage(utterance);
                        }
                    }
                    this._stopSpeechRecognition();
                    break;
                case 'partialResult':
                    if (data?.nbest?.length > 0) {
                        const utterance = data.nbest[0].utterance;
                        if (utterance.length > 0) {
                            this.userInputText(utterance);
                        }
                    }
                    break;
            }
        }
    };

    /**
     * Callback for speech network change
     *
     * @param {boolean} isClose
     */
    private _onSpeechNetworkChange = (isClose: number) => {
        this.isSpeechRunning(isClose === WebSocket.OPEN);
        this.isUserInteractive(isClose !== WebSocket.OPEN);
    };

    // Speech synthesis service handler methods

    /**
     * Starts Speech synthesis service.
     * If it can not be started, disables the text to speech related
     * functionalities.
     *
     * @private
     */
    private _setupSpeechSynthesis() {
        if (this.isUtterance()) {
            try {
                this._speechSynthesisService = SpeechSynthesisService.getInstance();
            } catch (e) {
                // Disable speech
                this.isUtterance(false);
                this.isTtsActive(false);
            }
        }
    }

    /**
     * Sends text to be spoken by Speech synthesis service.
     *
     * @private
     * @param {string} text
     */
    private _textToSpeechSpeak(text: string) {
        if (this.properties.expand && this.isTtsActive()) {
            this._speechSynthesisService.speak(text);
        }
    }

    /**
     * Resumes Speech synthesis service if it was paused.
     *
     * @private
     */
    private _textToSpeechResume() {
        if (this.isUtterance()) {
            this._speechSynthesisService.resume();
        }
    }

    /**
     * Cancels any ongoing and enqueued text for speaking.
     *
     * @private
     */
    private _textToSpeechCancel() {
        if (this.isUtterance()) {
            this._speechSynthesisService.cancel();
        }
    }

    // User messages send methods

    /**
     * Sends user text message to chat server.
     *
     * @private
     * @param {string} [text] text to send
     * @returns
     */
    private _sendUserTextMessage(text?: string): Promise<void> {
        text = text ?? this.userInputText()?.trim();
        if (!text) {
            return Promise.reject(false);
        }
        const payload = this._getDelegatedMessage(
            this.properties.delegate?.beforeSend,
            createUserTextPayload(this.config.userId, text));
        this.messages.push(new UserTextMessage(text));
        this.userInputText('');
        this._chatInput.focus();
        return this._chatServiceSendMessage(payload);
    }

    /**
     * Sends user attachment message to chat server.
     *
     * @private
     * @param {IUploadedFile} data Metadata about uploaded file
     */
    private _sendUserAttachmentMessage(data: IUploadedFile) {
        const payload = createUserAttachmentPayload(this.config.userId, data.type, data.url);
        this._chatServiceSendMessage(payload);
    }

    /**
     * Sends user location message to chat server.
     *
     * @private
     */
    private _sendUserLocationMessage() {
        if (navigator.geolocation) {
            this.messages.push(new BotLocationRequestMessage(this.res.requestLocation));
            setTimeout(() => {
                navigator.geolocation.getCurrentPosition((position) => {
                    if (this._isLocationRequest) {
                        this.messages.pop();
                        var payload = createUserLocationPayload(this.config.userId, position.coords.latitude, position.coords.longitude);
                        this.messages.push(new UserLocationMessage(position.coords.latitude, position.coords.longitude));
                        this._chatServiceSendMessage(payload);
                    }
                    this._isLocationRequest = false;
                }, () => {
                    this._displayLocationUnavailableMessage();
                });
            });
        } else {
            this._displayLocationUnavailableMessage();
        }
    }

    /**
     * Displays an unavailable location message when it is not accessible.
     * Asks user to send location as text instead.
     *
     * @private
     */
    private _displayLocationUnavailableMessage() {
        if (this._isLocationRequest) {
            this.messages.pop();
            this.messages.push(new BotLocationDeniedMessage(this.res.requestLocationString));
        }
        this._isLocationRequest = false;
    }

    // Utility methods

    /**
     * This method returns whether the component is ready for initialization
     *
     * @private
     * @returns {boolean}
     */
    private _isComponentReady() {
        return (this.properties.uri?.length > 0) && (
            (this.properties.channelId?.length > 0) || (
                this.properties.tokenGenerator &&
                typeof this.properties.tokenGenerator === 'function'));
    }

    /**
     * Set up IntersectionObserver Web API on chat conversation view to count
     * unseen messages
     *
     * @private
     */
    private _setupMessageIntersectionObserver() {
        const options = {
            root: this._chatConversation,
            rootMargin: '0px',
            threshold: 0.1
        };

        this._messageSeenObserver = new IntersectionObserver(this._onMessageIntersection, options);
    }

    /**
     * Callback method which is called when a target message being observed
     * intersects with conversation view.
     * If chat widget is open and target is visible, remove it from entries
     * being observed and decrement unread messages count.
     *
     * @param {IntersectionObserverEntry[]} entries
     * @param {IntersectionObserver} observer
     */
    private _onMessageIntersection: IntersectionObserverCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
        let unseenMessageCount = this.unseenMessageCount();
        entries.forEach(entry => {
            if (this.properties.expand && entry.isIntersecting) {
                observer.unobserve(entry.target);
                unseenMessageCount--;
            }
        });
        if (unseenMessageCount !== this.unseenMessageCount()) {
            this.unseenMessageCount(unseenMessageCount);
        }
    };

    /**
     * Modifies component classes to inject user theme colors
     *
     * @private
     */
    private _setupThemeClasses() {
        const style = document.createElement('style');
        const color = this.themeColor();
        style.type = 'text/css';
        style.innerHTML = `oj-oda-chat .oj-oda-chat-button {
            background-color: ${color};
            border-radius: 50%;
        }
        oj-oda-chat .oj-oda-chat-header {
            background-color: ${color};
        }
        oj-oda-chat .oj-oda-chat-footer-button.oj-hover {
            fill: ${color};
        }
        oj-oda-chat .oj-oda-chat-footer-button.oj-button.oj-active .oj-button-button {
            border-color: ${color};
            background-color: ${color};
        }
        oj-oda-chat .oj-oda-chat-action {
            border-color: ${color};
        }
        oj-oda-chat .oj-oda-chat-action:hover {
            background: ${color};
        }`;
        document.head.appendChild(style);
    }

    /**
     * Starts a timeout for each loading bubble waiting for response.
     * If the timeout is completed, it is assumed that server didn't respond
     * on time, and the loading bubble is removed.
     *
     * @private
     */
    private _trackWaitingBubbleForRemoval() {
        this.loadingBubbleId = setTimeout(() => {
            this.isWaitingForResponse(false);
        }, this.WAITING_RESPONSE_INDICATOR_TIMEOUT);
    }

    /**
     * Cancels timeout waiting for response to remove loading bubble
     *
     * @private
     */
    private _cancelWaitingBubbleForRemoval() {
        clearTimeout(this.loadingBubbleId);
    }


    /**
     * Checks if delegate method is provided and uses the message if it returns
     * a valid message.
     *
     * @private
     * @param {Function} func Delegate callback method
     * @param {object} fallbackMessage Original message passed to delegate and fallback if delegate returns invalid message
     * @returns {object} updated message
     */
    private _getDelegatedMessage(func: Function, fallbackMessage: object): object {
        if (func && typeof func === 'function') {
            const updatedPayload = func(fallbackMessage);
            if (updatedPayload?.messagePayload) {
                fallbackMessage = updatedPayload;
            }
        }
        return fallbackMessage;
    }

    /**
     * Returns first HTMLElement within the element that matches specified query
     * selector string.
     *
     * @private
     * @param {Element} element Element on which query is run
     * @param {string} queryString Selector or group of selectors to match
     * @returns {HTMLElement} First descendant element, parsed as HTMLElement,
     * that matches the selection criteria in passed element.
     */
    private _htmlQuerySelector(element: Element, queryString: string): HTMLElement {
        return (<HTMLElement><any>element.querySelector(queryString));
    }

    /**
     * Toggle component between collapsed button and expanded widget modes
     *
     * @private
     * @param {boolean} openComponent State to be applied
     */
    private _toggleComponent(openComponent: boolean) {
        if (openComponent) {
            this._chatButton.classList.remove('oj-oda-chat-close');
            this._chatWidget.classList.remove('oj-oda-chat-close');
            this._chatButton.classList.add('oj-oda-chat-open');
            this._chatWidget.classList.add('oj-oda-chat-open');
        } else {
            this._chatButton.classList.remove('oj-oda-chat-open');
            this._chatWidget.classList.remove('oj-oda-chat-open');
            this._chatButton.classList.add('oj-oda-chat-close');
            this._chatWidget.classList.add('oj-oda-chat-close');
        }
        this._chatButton.classList.remove('oj-oda-chat-none');
        this._chatWidget.classList.remove('oj-oda-chat-none');
    }

    /**
     * Sets channelId and userId using signed JWT token
     *
     * @private
     * @param {JwtToken} token
     */
    private _setParameters(token: JwtToken) {
        this.config.channelId = token.getClaim('channelId');
        this.config.userId = token.getClaim('userId');
    }

    /**
     * Scroll conversation view to bottom
     *
     * @private
     */
    private _scrollToBottom = () => {
        setTimeout(() => {
            if (this._chatConversation && this.properties.expand) {
                this._chatConversation.scrollTop = this._chatConversation.scrollHeight;
            }
        }, this.SCROLL_TIMEOUT);
    };


    // Public methods

    public _connect = () => {
        if (this.isConnected()) {
            return Promise.reject(new Error('The component is already connected to server. Please disconnect before attempting a new connection.'));
        }
        return this._setupChatServerService();
    };

    public _disconnect = () => {
        this._stopChatServerService();
    };

    public _sendMessage = (message: string | IMessagePayload) => {
        if (this.isConnected) {
            if (typeof message === 'string') {
                return this._sendUserTextMessage(message);
            } else {
                return this._chatServiceSendMessage(createUserPayload(this.config.userId, message));
            }
        } else {
            return Promise.reject(new Error('Could not send message. Connection to server is down.'));
        }
    };

    public _updateProfile = (userProfile: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (userProfile?.profile) {
                if (this._chatService.send(JSON.stringify(userProfile))) {
                    resolve();
                } else {
                    reject(new Error('Could not update user profile. The connection is down.'));
                }
            } else {
                reject(new Error('Could not update user profile. Profile not provided.'));
            }
        });
    }

    // Event dispatching

    /**
     * Dispatches message event
     *
     * @private
     * @param {string} event
     * @param {*} data
     */
    private dispatchMessageEvent(event: string, data: any) {
        const eventParams = {
            bubbles: false,
            cancelable: false,
            detail: {
                message: data
            }
        };
        this.composite.dispatchEvent(new CustomEvent(event, eventParams));
    }

    // Lifecycle methods - implement if necessary

    activated(context: Composite.ViewModelContext<Composite.PropertiesType>): Promise<any> | void {

    };

    connected(context: Composite.ViewModelContext<Composite.PropertiesType>): void {

    };

    bindingsApplied(context: Composite.ViewModelContext<Composite.PropertiesType>): void {
        this._chatButton = this._htmlQuerySelector(context.element, '.oj-oda-chat-button');
        this._chatWidget = this._htmlQuerySelector(context.element, '.oj-oda-chat-widget');
        this._chatHeader = this._htmlQuerySelector(this._chatWidget, '.oj-oda-chat-header');
        this._chatConversation = this._htmlQuerySelector(this._chatWidget, '.oj-oda-chat-conversation');
        this._chatFooter = this._htmlQuerySelector(this._chatWidget, '.oj-oda-chat-footer');
        this._chatInput = this._htmlQuerySelector(this._chatFooter, '.oj-oda-chat-user-input');

        this._initializeComponent();

        if (this._isComponentReady()) {
            this._startServices();
        }
    };

    propertyChanged(context: Composite.PropertyChangedContext<Composite.PropertiesType>): void {
        switch (context.property) {
            case 'expand':
                this._toggleComponent(context.value);
                break;
            case 'uri':
                if (this._isComponentReady()) {
                    this._startServices();
                }
                break;
            case 'channelId':
                if (this._isComponentReady()) {
                    this._startServices();
                }
                break;
            case 'tokenGenerator':
                if (this._isComponentReady()) {
                    this._startServices();
                }
                break;
        }
    };

    disconnected(element: Element): void {

    };
};
