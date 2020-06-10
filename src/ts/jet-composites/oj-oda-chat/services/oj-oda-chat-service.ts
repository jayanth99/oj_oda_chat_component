import { TOKEN_TYPE, buildPingMessage, isPongMessage, buildAuthTokenMessage } from '../oj-oda-chat-utils';
import { AuthTokenService } from './oj-oda-chat-auth-token-service';

export class ChatService {

    private readonly ABNORMAL_CLOSURE = 1006;

    // Connection reattempt parameters
    private readonly MAX_RECONNECTION_ATTEMPTS = 5;
    private readonly RECONNECTION_INTERVAL = 5 * 1000;

    // Ping pong parameters
    private readonly PING_PONG_INTERVAL = 30 * 1000;    // 30 seconds

    private ws: WebSocket;
    private reconnectionAttempt = 0;
    private _forcedClose = false;
    private _onlyTokenSent = false;

    /**
     * Creates an instance of ChatService.
     * @param {string} url Connection URL
     */
    constructor(private url: string, private protocols?: string | string[], private authTokenService?: AuthTokenService) {
        window.addEventListener('online', () => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.close();
            }
            this.connect();
        });

        window.addEventListener('offline', () => {
            if (this.ws?.readyState !== WebSocket.CLOSED) {
                this.close();
            }
        });

        this.connect();
    }

    public onclose = (event: CloseEvent) => { };
    public onerror = (event: Event) => { };
    public onmessage = (event: MessageEvent) => { };
    public onopen = (event: Event) => { };
    public onstatuschange = (status: number) => { };

    public close(code?: number, reason?: string) {
        this._forcedClose = true;
        if (this.ws) {
            this.ws.close(code, reason);
        }
    }

    public send(data: any): boolean {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this._onlyTokenSent = false;
            try {
                this.ws.send(data);
            } catch (error) {
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Establishes WebSocket connection to chat server with reconnection
     * support in case of failure
     *
     * @private
     */
    private connect() {
        let pingPongTimer;

        const onOpenConnect = (event: Event) => {
            this.reconnectionAttempt = 0;
            pingPongTimer = this.initPingPong();
            this.setReadyState(WebSocket.OPEN);
            this.onopen(event);
        };

        this.setReadyState(WebSocket.CONNECTING);
        this.ws = new WebSocket(this.url, this.protocols);

        this.ws.onopen = (event: Event) => {
            if (this.authTokenService) {
                this._onlyTokenSent = true;
                this.authTokenService.getToken()
                    .then((jwtToken) => {
                        this.ws.send(JSON.stringify(buildAuthTokenMessage(TOKEN_TYPE.JWT, jwtToken.token)));

                        setTimeout(() => {
                            this._onlyTokenSent = false;
                        }, 20000);
                        onOpenConnect(event);
                    });
            } else {
                onOpenConnect(event);
            }
        };

        this.ws.onclose = (event) => {
            this.setReadyState(WebSocket.CLOSING);
            this.ws = null;
            clearInterval(pingPongTimer);

            if (this._forcedClose) {
                this._forcedClose = false;
                this.setReadyState(WebSocket.CLOSED);
                this.onclose(event);
            } else if (this.authTokenService && this._onlyTokenSent && event.code !== this.ABNORMAL_CLOSURE) {
                console.error('Token authentication failed, connection closed.');
                this.setReadyState(WebSocket.CLOSED);
                this.onclose(event);
            } else {
                setTimeout(() => {
                    if (this.reconnectionAttempt >= this.MAX_RECONNECTION_ATTEMPTS) {
                        this.setReadyState(WebSocket.CLOSED);
                        this.onclose(event);
                    } else {
                        this.reconnectionAttempt++;
                        this.setReadyState(WebSocket.CONNECTING);
                        this.connect();
                    }
                }, this.RECONNECTION_INTERVAL);
            }
        };

        this.ws.onmessage = (event: MessageEvent) => {
            if (event.data) {
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch (e) {
                    console.error('Error in parsing message ', event.data);
                }
                // Consume pong here, propagate other messages
                if (data && !isPongMessage(data)) {
                    this.onmessage(data);
                }
            }
        };

        this.ws.onerror = (event) => {
            this.onerror(event);
        };
    }

    /**
     * Initiates ping-pong message with chat server to keep the connection alive
     *
     * @private
     * @returns id of the interval timer
     */
    private initPingPong() {
        return setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(buildPingMessage()));
            }
        }, this.PING_PONG_INTERVAL);
    }

    /**
     * Sets current readystate of WebSocket
     *
     * @private
     * @param {number} status WebSocket connection status
     */
    private setReadyState(status) {
        this.onstatuschange(status);
    }
}
