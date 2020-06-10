import { JwtToken } from '../oj-oda-chat-jwt-token';

class AuthTokenService {

    /**
     * Provides a singleton instance of Auth Token Service.
     *
     * @static
     * @returns {AuthTokenService}
     */
    public static getInstance() {
        if (!AuthTokenService._service) {
            AuthTokenService._service = new AuthTokenService();
        }
        return AuthTokenService._service;
    }

    private static _service: AuthTokenService;

    private _currentAuthToken: JwtToken;
    private _mFetchToken: Function;

    private constructor() {}

    /**
     * Sets the callback function to be used to fetch a new token
     *
     * @param {Function} fetchTokenMethod
     */
    public setFetchTokenMethod(fetchTokenMethod: Function) {
        this._mFetchToken = fetchTokenMethod;
    }

    /**
     * Returns a Promise to provide JWT token. If the existing token is not
     * expired, it is reused. Otherwise, the function calls the user provided function
     * to fetch a new token.
     * @returns {Promise<any>} Promise to return a valid JwtToken
     */
    public getToken(): Promise<JwtToken> {
        return new Promise((resolve, reject) => {
            if (!this._mFetchToken) {
                reject(new Error('No function has been provided to fetch newly generated auth token. Please create a function that returns a Promise to generate new JWT token when called.'));
            } else if (this._currentAuthToken && !this._isTokenExpired()) {
                resolve(this._currentAuthToken);
            } else {
                const fetchToken = this._mFetchToken();
                if (fetchToken !== null && (typeof fetchToken === 'object' || typeof fetchToken === 'function') && typeof fetchToken.then === 'function') {
                    fetchToken.then((token) => {
                        this._currentAuthToken = new JwtToken(token);
                        if (this._isValidToken()) {
                            resolve(this._currentAuthToken);
                        } else {
                            reject(new Error('Token doesn\'t contain all mandatory claims.'));
                        }
                    }, (reason) => reject(reason));
                } else {
                    reject(new Error('Please provide a function that can return a Promise resolving to a token.'));
                }
            }
        });
    }

    /**
     * Returns if the passed token is expired
     *
     * @private
     * @returns {boolean}
     */
    private _isTokenExpired(): boolean {
        const networkLatency = 20; // Assumption to take up to 20 seconds to reach server
        const expiryTime = Math.floor(Date.now() / 1000) + networkLatency;
        return this._currentAuthToken.getClaim('exp') < expiryTime;
    }

    /**
     * Validates if token has all required claims present
     *
     * @private
     * @returns {boolean}
     */
    private _isValidToken(): boolean {
        return this._currentAuthToken.getClaim('channelId') &&
            this._currentAuthToken.getClaim('userId');
    }
}

export { AuthTokenService };
