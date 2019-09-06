# NativeScript Pushy

[![Build Status][build-status]][build-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Twitter Follow][twitter-image]][twitter-url]

[build-status]:https://travis-ci.org/EddyVerbruggen/nativescript-pushy.svg?branch=master
[build-url]:https://travis-ci.org/EddyVerbruggen/nativescript-pushy
[npm-image]:http://img.shields.io/npm/v/nativescript-pushy.svg
[npm-url]:https://npmjs.org/package/nativescript-pushy
[downloads-image]:http://img.shields.io/npm/dm/nativescript-pushy.svg
[twitter-image]:https://img.shields.io/twitter/follow/eddyverbruggen.svg?style=social&label=Follow%20me
[twitter-url]:https://twitter.com/eddyverbruggen

> Hop on over to [Pushy.me](https://pushy.me/) to get started!

## Installation
```bash
tns plugin add nativescript-pushy
```

For {N} 5 and below please use
```bash
tns plugin add nativescript-pushy@1.x
```

## Demo app
Check the source in the [demo](/demo) folder, or run it on your own device:

```bash
git clone https://github.com/EddyVerbruggen/nativescript-pushy
cd nativescript-pushy/src
npm i
npm run demo.ios # or demo.android
```

## Setup (iOS only)
Create a file called either `app.entitlements` or `<YourAppName>.entitlements` (where `YourAppName` is identical to the folder name of `platforms/ios/YourAppName`). [Here's an example](https://github.com/EddyVerbruggen/nativescript-pushy/blob/master/demo/app/App_Resources/iOS/app.entitlements).

Now reference that file from `build.xcconfig` [as shown here](https://github.com/EddyVerbruggen/nativescript-pushy/blob/master/demo/app/App_Resources/iOS/build.xcconfig).

## API

### `getDevicePushToken`
```typescript
import { getDevicePushToken } from "nativescript-pushy";

getDevicePushToken()
    .then(token => console.log(`getDevicePushToken success, token: ${token}`))
    .catch(err => console.log(`getDevicePushToken error: ${err}`));
```

### `setNotificationHandler`
Since plugin version 1.1.0 the *entire* payload of the notification is copied to the object this handler receives,
but note that it all gets copied into a `data` object. So if you send for instance `{"foo": "bar"}`,
you can find the value `"bar"` at `notification.data.foo`. 

```typescript
import { setNotificationHandler } from "nativescript-pushy";

setNotificationHandler(notification => {
  console.log(`Notification received: ${JSON.stringify(notification)}`);
});
```

One of the properties of the returned `notification` object is `foreground`, which indicates whether or not
the notification was received while the app was in either the foreground or background.

Another useful property may be `appLaunchedByNotification`, which indicates whether or not the app was launched
by tapping the notification (as opposed to the app's icon). When this property is `true` you may want to fi.
navigate to a different route in your app.

## Please note..

> ⚠️ Do not test on a the iOS simulator as it can't receive push notifications.
