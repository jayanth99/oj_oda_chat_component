/**
 * JWT Token model
 *
 * @class JwtToken
 */
class JwtToken {
    private readonly _header: object;
    private readonly _payload: object;

    constructor(private readonly _token: string) {
        const tokenParts = this._token.split('.');
        this._header = JSON.parse(atob(tokenParts[0]));
        this._payload = JSON.parse(atob(tokenParts[1]));
    }

    get token(): string {
        return this._token;
    }

    get header(): object {
        return this._header;
    }

    get payload(): object {
        return this._payload;
    }

    public getClaim(key: string): any {
        return this.payload[key];
    }
}

export { JwtToken };
