# ODA Chat

`<oj-oda-chat>` provides a custom web component for integrating Oracle Digital Assistant Chat with Visual Builder.

## Browser Support
The Component is supported on following browsers in Mac, Windows, and Linux:
* Firefox
* Chrome
* Safari
* Edge

For mobile platforms, following browsers are supported:
* Android browser
* iOS Safari

Internet Explorer is not officially supported by the Chat Component.


## Component Security
The Chat Component can connect to Web channel at ODA in two ways:

### Channel with Client Auth Disabled
In this case, only connections made from whitelisted domains are allowed at the server.

This use case is recommended when the client application can't generate a signed JWT Token (static website or no authentication mechanism for the web/mobile app) but wants to have ODA integration. It can also be used when Chat Component is already secured and visible only for authenticated users in clients platforms (Web Application with protected page).

When connecting to such channels, **channel-id** property must be set when adding the Component. **user-id** is another property that is used to establish the connection, but it is optional, and Component generates a random user-id if it is not passed in the element declaration.

Component example with connection to client auth disabled channel

```html
<oj-oda-chat
    uri="oda-instance-name.com"
    channel-id="626f5db1-f99a-4984-86ee-df2d734537e6"
    user-id="John">
</oj-oda-chat>
```


### Channel with Client Auth Enabled
In this case, in addition to domain whitelisting, client authentication is enforced by signed JWT tokens.

The token generation and signing must be done by the client in their backend server, preferable after user/client authentication.

When the Component needs to establish a connection with the ODA Server, it first requests generation of a JWT token from the client by calling token-generator function. Once the function resolves the returned Promise to a JWT token, Component sends it along with connection request. The ODA server validates the token signature and obtains the claim set from the JWT payload to verify the token to establish the connection.

To enable this mode, the property **token-generator** must be set with a function. The function must return a *Promise*, which is resolved to return a signed JWT token *string*.

```html
<script>
    const generateToken = function() {
        return new Promise((resolve) => {
            fetch('https://yourbackend.com/endpointToGenerateJWTToken').then((token) => {
                resolve(token);
            });
        });
    }
</script>

<oj-oda-chat
    uri="oda-instance-name.com"
    token-generator="[[generateToken]]">
</oj-oda-chat>
```

Note: The Component and ODA server authenticates that chat request is coming from a valid client, it does not perform user authentication.

### JWT Token
The JWT token generation and signing are responsibility of the client application, some of the token payload fields are mandatory and validated by the ODA server.

Clients must use HS256 signing algorithm to sign the tokens. The tokens must be signed by secret key of the client auth enabled channel to which the connection is made. The body of the token must have following claims:

* `iat` - issued at time
* `exp` - expiry time
* `channelId` - channel ID
* `userId` - user ID

Here's a sample signed JWT token:

Encoded token:

```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1NzY3NDcyMDUsImV4cCI6MTU3Njc1MTExNywiY2hhbm5lbElkIjoiNDkyMDU5NWMtZWM3OS00NjE3LWFmOWYtNTk1MGQ2MDNmOGJiIiwidXNlcklkIjoiSm9obiIsImp0aSI6ImQzMjFjZDA2LTNhYTYtNGZlZS05NTBlLTYzZGNiNGVjODJhZCJ9.lwomlrI6XYR4nPQk0cIvyU_YMf4gYvfVpUiBjYihbUQ
```

Decoded token:

Header:

```json
{
    "typ": "JWT",
    "alg": "HS256"
}
```

Payload:

```json
{
    "iat": 1576747205,
    "exp": 1576748406,
    "channelId": "4920595c-ec79-4617-af9f-5950d603f8bb",
    "userId": "John"
}
```

Any additional claims passed in the payload do not affect the client authentication mechanism.


## Properties
Following properties can be configured in `<oj-oda-chat>` Chat Component.

### uri

`required: Yes`

URI of the ODA server to which Component will be connected.


### token-generator

`required: Required for connecting to client auth enabled channel`

Function to generate signed JWT tokens. The function must return a Promise that is resolved to a JWT token string.

The function is used by the Component to generate tokens at appropriate times to establish connection to server, send attachments, or send user's speech. The existing token is reused as long as it is not expired. Whenever the existing token is expired and a new connection is to be made, e.g. for conversation or uploading attachments, the Component calls the generator to fetch a new token.

The function needs to be passed using one-way data binding syntax, `[[function]]`.


### channel-id

`required: Required for connecting to client auth disabled channel, ignored for client auth enabled channel`

ID of the Web channel on ODA server to which Component will connect. It is a required field for connecting to channel with client auth disabled. If the field is set along with `token-generator`, the value is ignored.


### user-id
ID to identify user. When connecting to channel with client auth disabled, the field is optional. If it is not provided, the Component generates a random user ID for the session. If the field is set along with `token-generator`, the value is ignored.


### chat-title
Title displayed in the header of Chat Component. No title is set if the property is not set.

```html
<oj-oda-chat ... chat-title="Pizzeria">
```


### init-message
An optional Initial text message that is sent to server on first connection. The message is not displayed in conversation view. A typical use-case of this message is to imitate conversation initiated by skill/DA to the user.

```html
<oj-oda-chat ... init-message="Show today's menu">
```


### expand
Boolean flag to determine and set whether the Chat Component is expanded or collapsed. The default value is false, i.e. the Chat Component initializes in collapsed form.

The property can be bound two-way to an observable using {{}} syntax. With this, the host gets notified whenever the Component is collapsed or expanded, and it can also force the Component to collapse or expand.

```html
<oj-oda-chat ... expand="{{expand}}">
```

It can also be set without the observable for initial layout:

```html
<oj-oda-chat ... expand="true">
```

### network-status
Network status is a readonly property that can be subscribed for changes in Component's connection to server. It is updated to one of 4 enumerations mapped to [WebSocket connection values](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket#Constants) - CONNECTING, OPEN, CLOSING, CLOSED.

It can be bound using two-way binding, but as it is readonly property, any change from user's side is not reflected to the Component.

```html
<oj-oda-chat ... network-status="{{networkStatus}}">
```

### unseen-count
Unseen count is a readonly property that gives the count of messages from server which haven't been seen yet by the user.

It can be bound using two-way binding to get notified whenever the unread count is changed.

```html
<oj-oda-chat ... unseen-count="{{unseenCount}}">
```

### delegate
Delegate is a super property that allows setting callbacks to modify messages from server before displaying, or sending user messages to server. Messages are passed as a parameter to the callbacks and expected to be returned, optionally with some modifications. If no value is returned, the original message is used.

### delegate.before-display
Callback that is called before display of message received from server.

```html
<script>
    const beforeDisplay = (message) => {
        // Ensure all cards messages are displayed as a carousal
        if (message.messagePayload && message.messagePayload.type === 'card') {
            message.messsagePaylaod.layout = 'horizontal';
        }
        return message;
    }
</script>

<oj-oda-chat delegate.before-display="[[beforeDisplay]]">
```


### delegate.before-send
Callback that is called before sending user message to server.

```html
<oj-oda-chat delegate.before-send="[[beforeSend]]">
```


### delegate.before-postback-send
Callback that is called before sending user postback message to server which are raised when user clicks on a postback action.

```html
<oj-oda-chat delegate.before-postback-send="[[beforePostbackSend]]">
```


### display-options
Super property that lists switches to enable or disable features and configure UI.

### display-options.attachment
Enables uploading files to the server. The default is `true`.

```html
<oj-oda-chat display-options.attachment="false">
```


### display-options.color-theme
Sets a color to be applied as the theme to the Component. The header and actions depicted in the color set by this field.

```html
<oj-oda-chat display-options.color-theme="#403c38">
```


### display-options.connection-status
Enables display of live connection status to server in header. Default is `true`.

```html
<oj-oda-chat display-options.connection-status="false">
```


### display-options.erasable
Enables display of button to erase messages from current conversation. Default is `true`.

```html
<oj-oda-chat display-options.erasable="false">
```


### display-options.speech
Enables speech service integration that allows users to use their voice for forming messages, convert to text and send to server. Default is `false`.

```html
<oj-oda-chat display-options.speech="true">
```


### display-options.utter-bot-message
Enables display of a button to activate client's speech synthesis to utter bot responses. Default is `false`.

```html
<oj-oda-chat display-options.utter-bot-message="true">
```


## Methods
Methods are functions that are exposed by the Component that one can call once it is running. You can use these as a way to pass information into the Component after it has been started, or manipulate the Component as a whole. The methods can be invoked by getting a reference to the Chat Component and making the function call.

```js
const bot = document.getElementsByTagName('oj-oda-chat')[0];
bot.sendMessage('order pizza');
```

### connect()
This method establishes connection to the chat server. It returns a Promise that is resolved on a successful connection. If a connection is already alive, the Promise is rejected with an Error. It accepts no parameters, using the connection parameters from properties.

```js
const bot = document.getElementsByTagName('oj-oda-chat')[0];
bot.connect().then(() => { console.log('Successful connection.'); }, () => { console.log('Connection failed.'); });
```


### disconnect()
This method closes active connection to the chat server. If there is no connection, it performs no action. The function does not return any value.


### sendAttachment(file)
This method uploads file to the server. It accepts a File object and returns a Promise that is resolved for a successful upload and rejected for any issue in uploading with an Error.


### sendMessage(message)
This method sends a message to the chat server. It can accept a text string for a simple text message, or a message payload object that needs to follow the conversation message model. The method returns a Promise that is resolved for a successful delivery and rejected for unsuccessful delivery.


### updateUser(userProfile)
This method updates user profile at chat server. The userProfile object must have a `profile` field, otherwise the call is rejected. The method returns a Promise that is resolved for a successful profile update and rejected for unsuccessful update.

```js
const bot = document.getElementsByTagName('oj-oda-chat')[0];
bot.updateUser({
    messagePayload: {
        text: '222',
        type: 'text'
    },
    profile: {
        givenName: 'Updated123',
        surname: 'Name',
        email: 'updated@email.com',
        properties: {
            justGotUpdated: true
        }
    }
})
```


## Events
Events are used to signal some activity. For Chat Component, two custom events are exposed in addition to default events.

### chatMessageReceived
This event is dispatched on receiving a message from server. Listener for it can be wired up as:

`<oj-oda-chat ... on-chat-message-received="[[receive-event-watcher]]"`

The message received is passed in the event that is received by the listener, which can be inspected at event.detail.message.


### chatMessageSend
This event is dispatched on sending a message to server. Listener for it can be wired up as:

`<oj-oda-chat ... on-chat-message-send="[[send-event-watcher]]"`

The message sent is passed in the event that is received by the listener, which can be inspected at event.detail.message.


## Message Model
To use features like delegate, a clear understanding of bot and user messages is essential. Every object received from and sent to chat server are represented as Messages. This includes:
* Messages from User → Bot (eg. "I want to order a Pizza")
* Messages from Bot → User (e.g. "What kind of crust do you want?")

The following section describes each of the message types in more detail.

### Base Types
These are the base types that are used by User → Bot messages and Bot → User messages. They are the building blocks for the messages.


#### Attachment
This represents an attachment sent User → Bot or Bot → User.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Type</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>title</td>
            <td>A title for the attachment</td>
            <td>string</td>
            <td>No</td>
        </tr>
        <tr>
            <td>type</td>
            <td>The type of attachment</td>
            <td>string (valid values: audio, file, image, video)</td>
            <td>Yes</td>
        </tr>
        <tr>
            <td>url</td>
            <td>The url to download the attachment</td>
            <td>string</td>
            <td>Yes</td>
        </tr>
    </tbody>
</table>

Example JSON
```json
{
    "title": "Oracle Open World Promotion",
    "type": "image",
    "url": "https://www.oracle.com/us/assets/hp07-oow17-promo-02-3737849.jpg"
}
```


#### Location
This represents a Location object.

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>title</td>
        <td>A title for the location</td>
        <td>string</td>
        <td>No</td>
    </tr>
    <tr>
        <td>url</td>
        <td>A url for displaying a map of the location</td>
        <td>string</td>
        <td>No</td>
    </tr>
    <tr>
        <td>latitude</td>
        <td>The GPS coordinate's longitude value</td>
        <td>double</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>longitude</td>
        <td>The GPS coordinate's longitude value</td>
        <td>double</td>
        <td>Yes</td>
    </tr>
</table>

Example JSON
```json
{
    "title": "Oracle Headquarters",
    "url": "https://www.google.com.au/maps/place/37°31'47.3%22N+122°15'57.6%22W",
    "longitude": -122.265987,
    "latitude": 37.529818
}
```


#### Action
An action represents something that the user can select. Every action includes following properties:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>Action type for the action</td>
        <td>string</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>label</td>
        <td>Label to display for the action</td>
        <td>string</td>
        <td>At least one of `label` or `imageUrl` will be present</td>
    </tr>
    <tr>
        <td>imageUrl</td>
        <td>Image to display for the action</td>
        <td>string</td>
        <td>At least one of `label` or `imageUrl` will be present</td>
    </tr>
</table>


##### PostbackAction
This action will send a pre-defined Postback back to the Bot if the user selects the action.
It adds the following properties to the `Action` properties:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>Action type for the action</td>
        <td>"postback"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>postback</td>
        <td>The postback to be sent back if the action is selected</td>
        <td>string or JSONObject</td>
        <td>Yes</td>
    </tr>
</table>

Example JSON
```json
{
    "type": "postback",
    "label": "Large Pizza",
    "imageUrl": "https://amicis.com/images/gallery/locations/11.jpg",
    "postback": {
        "state": "askSize",
        "action": "getCrust"
    }
}
```


##### CallAction
This action will request the client to call a specified phone number on the user's behalf.
It adds the following properties to the `Action` properties:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>Action type for the action</td>
        <td>"call"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>phoneNumber</td>
        <td>The phone number to call</td>
        <td>string</td>
        <td>Yes</td>
    </tr>
</table>

Example JSON
```json
{
    "type": "call",
    "label": "Call Support",
    "imageUrl": "http://ahoraescuando.bluefm.com.ar/files/2016/05/cuidado.jpg",
    "phoneNumber": "18002231711"
}
```


##### UrlAction
This action will request the client to open a website in a new tab or in an in-app browser.
It adds the following properties to the `Action` properties:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>Action type for the action</td>
        <td>"call"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>url</td>
        <td>The url of the website to display</td>
        <td>string</td>
        <td>Yes</td>
    </tr>
</table>


##### ShareAction
This action will request the client to open a sharing dialog for the user.
It adds the following properties to the `Action` properties:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>Action type for the action</td>
        <td>"share"</td>
        <td>Yes</td>
    </tr>
</table>


##### LocationAction
This action will request the client to ask the user for a location.
It adds the following properties to the `Action` properties:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>Action type for the action</td>
        <td>"location"</td>
        <td>Yes</td>
    </tr>
</table>

Example JSON
```json
{
    "type": "location",
    "label": "Share location",
    "imageUrl": "http://images.clipartpanda.com/location-clipart-location-pin-clipart-1.jpg"
}
```


#### Card
A card represents a single card in the message payload.  It contains the following properties:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>title</td>
        <td>The title of the card, displayed as the first line on the card.</td>
        <td>string</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>description</td>
        <td>The description of the card</td>
        <td>string</td>
        <td>No</td>
    </tr>
    <tr>
        <td>imageUrl</td>
        <td>URL of the image that is displayed</td>
        <td>string</td>
        <td>No</td>
    </tr>
    <tr>
        <td>url</td>
        <td>URL of a website that is opened when taping on the card</td>
        <td>string</td>
        <td>No</td>
    </tr>
    <tr>
        <td>actions</td>
        <td>An array of actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
</table>


### Conversation Messages
All messages part of the conversation are structured as follows:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>messagePayload</td>
        <td>Message payload</td>
        <td>Message</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>userId</td>
        <td>User ID</td>
        <td>string</td>
        <td>Yes</td>
    </tr>
</table>

Example conversation message
```json
{
    "messagePayload": {
        "text": "show menu",
        "type": "text"
    },
    "userId": "guest"
}
```


### Message
Message is the abstract base type for all other messages. All messages extend it to provide more information.

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>string</td>
        <td>Yes</td>
    </tr>
</table>


### User Message
This represents a Message sent from User → Bot.


#### User Text Message
This is a simple text message sent to the server.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"text"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>text</td>
        <td>Text message</td>
        <td>string</td>
        <td>Yes</td>
    </tr>
</table>

```json
{
    "messagePayload": {
        "text": "Order Pizza",
        "type": "text"
    },
    "userId": "guest"
}
```


#### User Postback Message
This is the postback response message sent to the server.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"postback"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>text</td>
        <td>Text for postback</td>
        <td>string</td>
        <td>No</td>
    </tr>
    <tr>
        <td>postback</td>
        <td>The postback of the selected action</td>
        <td>string or JSONObject</td>
        <td>Yes</td>
    </tr>
</table>

```json
{
    "messagePayload": {
        "postback": {
            "variables": {
                "pizza": "Small"
            },
            "system.botId": "69F2D6BB-35BF-4BCA-99A0-A88D44A51B35",
            "system.state": "orderPizza"
        },
        "text": "Small",
        "type": "postback"
    },
    "userId": "guest"
}
```


#### User Attachment Message
This is the attachment response message sent to the server.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"attachment"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>attachment</td>
        <td>Attachment metadata</td>
        <td>Attachment</td>
        <td>Yes</td>
    </tr>
</table>

```json
{
    "messagePayload": {
        "attachment": {
            "type": "image",
            "url": "http://oda-instance.com/attachment/v1/attachments/d43fd051-02cf-4c62-a422-313979eb9d55"
        },
        "type": "attachment"
    },
    "userId": "guest"
}
```


#### User Location Message
This is the location response message sent to the server.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"location"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>location</td>
        <td>User location information</td>
        <td>Location</td>
        <td>Yes</td>
    </tr>
</table>

```json
{
    "messagePayload": {
        "location": {
            "latitude": 45.9285271,
            "longitude": 132.6101925
        },
        "type": "location"
    },
    "userId": "guest"
}
```


### Bot Message
This represents a Message sent from Bot → User.


#### Bot Text Message
This represents a text message.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"text"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>text</td>
        <td>Text of the message</td>
        <td>string</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>actions</td>
        <td>An array of actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
    <tr>
        <td>globalActions</td>
        <td>An array of global actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
</table>

```json
{
    "messagePayload": {
        "type": "text",
        "text": "What do you want to do?",
        "actions": [
            {
                "type": "postback",
                "label": "Order Pizza",
                "postback": {
                    "state": "askAction",
                    "action": "orderPizza"
                }
            },
            {
                "type": "postback",
                "label": "Cancel A Previous Order",
                "postback": {
                    "state": "askAction",
                    "action": "cancelOrder"
                }
            }
        ]
    },
    "userId": "guest"
}
```


#### Bot Location Message
This represents a location message.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"location"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>location</td>
        <td>The location</td>
        <td>Location</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>actions</td>
        <td>An array of actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
    <tr>
        <td>globalActions</td>
        <td>An array of global actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
</table>


#### Bot Attachment Message
This represents an attachment message.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"attachment"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>attachment</td>
        <td>The attachment sent</td>
        <td>Attachment</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>actions</td>
        <td>An array of actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
    <tr>
        <td>globalActions</td>
        <td>An array of global actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
</table>


#### Bot Card Message
This represents a set of choices displayed to the user, either horizontally like a carousal or vertically like a list.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"card"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>layout</td>
        <td>Whether to display the cards horizontally or vertically</td>
        <td>string (values: horizontal, vertical)</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>cards</td>
        <td>Array of cards to be rendered</td>
        <td>Array&lt;Card&gt;</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>headerText</td>
        <td>A header text for cards</td>
        <td>string</td>
        <td>No</td>
    </tr>
    <tr>
        <td>actions</td>
        <td>An array of actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
    <tr>
        <td>globalActions</td>
        <td>An array of global actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
</table>

Example JSON
```json
{
    "messagePayload": {
        "type": "card",
        "layout": "horiztonal",
        "cards": [
            {
                "title": "Hawaiian Pizza",
                "description": "Ham and pineapple on thin crust",
                "actions": [
                    {
                        "type": "postback",
                        "label": "Order Small",
                        "postback": {
                            "state": "GetOrder",
                            "variables": {
                                "pizzaType": "hawaiian",
                                "pizzaCrust": "thin",
                                "pizzaSize": "small"
                            }
                        }
                    },
                    {
                        "type": "postback",
                        "label": "Order Large",
                        "postback": {
                            "state": "GetOrder",
                            "variables": {
                                "pizzaType": "hawaiian",
                                "pizzaCrust": "thin",
                                "pizzaSize": "large"
                            }
                        }
                    }
                ]
            },
            {
                "title": "Cheese Pizza",
                "description": "Cheese pizza (i.e. pizza with NO toppings) on thick crust",
                "actions": [
                    {
                        "type": "postback",
                        "label": "Order Small",
                        "postback": {
                            "state": "GetOrder",
                            "variables": {
                                "pizzaType": "cheese",
                                "pizzaCrust": "thick",
                                "pizzaSize": "small"
                            }
                        }
                    },
                    {
                        "type": "postback",
                        "label": "Order Large",
                        "postback": {
                            "state": "GetOrder",
                            "variables": {
                                "pizzaType": "cheese",
                                "pizzaCrust": "thick",
                                "pizzaSize": "large"
                            }
                        }
                    }
                ]
            }
        ],
        "globalActions": [
            {
                "type": "call",
                "label": "Call for Help",
                "phoneNumber": "123456789"
            }
        ]
    },
    "userId": "guest"
}
```


#### Bot Postback Message
This represents a postback.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"postback"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>text</td>
        <td>Text of the message</td>
        <td>string</td>
        <td>No</td>
    </tr>
    <tr>
        <td>postback</td>
        <td>The postback</td>
        <td>string or JSONObject</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>actions</td>
        <td>An array of actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
    <tr>
        <td>globalActions</td>
        <td>An array of global actions related to the text</td>
        <td>Array&lt;Action&gt;</td>
        <td>No</td>
    </tr>
</table>


#### Bot Raw Message
This is used when a component creates the channel-specific payload itself.
It applies following properties to the Message:

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Type</td>
        <td>Required</td>
    </tr>
    <tr>
        <td>type</td>
        <td>The message type</td>
        <td>"raw"</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>payload</td>
        <td>The channel-specific payload</td>
        <td>JSONObject</td>
        <td>Yes</td>
    </tr>
</table>


## Limitations
There are a few limitations on the usage of current Web Component.

* The responses from the skill may become incorrect if the network goes offline in between a chat and comes back online in short time. This only happens when a server response is lost due to network failure. In such cases, user may have to send previous message again, or may need to start the conversation afresh. The skill can be designed to handle such cases.
* The attachment file size is limited to 25MB. Heavier files can not be uploaded in this release.
