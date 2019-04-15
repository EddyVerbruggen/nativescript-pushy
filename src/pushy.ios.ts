import * as application from "tns-core-modules/application/application";
import { getClass } from "tns-core-modules/utils/types";
import { TNSPushNotification } from "./";

let notificationHandler: (notification: TNSPushNotification) => void;
let pendingNotifications: Array<TNSPushNotification> = [];
let latestDevicePushToken: string;
let latestDevicePushTokenError: string;
let getDevicePushTokenResolve: any;
let getDevicePushTokenReject: any;
let pushy;

function getAppDelegate() {
  // Play nice with other plugins by not completely ignoring anything already added to the appdelegate
  if (application.ios.delegate === undefined) {

    @ObjCClass(UIApplicationDelegate)
    class UIApplicationDelegateImpl extends UIResponder implements UIApplicationDelegate {
    }

    application.ios.delegate = UIApplicationDelegateImpl;
  }
  return application.ios.delegate;
}

getAppDelegate().prototype.applicationWillEnterForeground = (application: UIApplication) => {
  UIApplication.sharedApplication.applicationIconBadgeNumber = 0;
};

const wireNotificationHandler = () => {
  pushy = Pushy.alloc().init(UIApplication.sharedApplication);

  // we need to do this here, otherwise a killed app will not receive the notification details upon tap
  pushy.register((error: NSError, deviceToken: string) => {
    if (error !== null) {
      if (getDevicePushTokenReject) {
        getDevicePushTokenReject(error.localizedDescription);
        getDevicePushTokenReject = undefined;
      }
      latestDevicePushTokenError = error.localizedDescription;
      latestDevicePushToken = undefined;
    } else {
      if (getDevicePushTokenResolve) {
        getDevicePushTokenResolve(deviceToken);
        getDevicePushTokenResolve = undefined;
      }
      latestDevicePushToken = deviceToken;
      latestDevicePushTokenError = undefined;
    }
  });

  pushy.setNotificationHandler((data: NSDictionary<any, any>, completionHandler: (backgroundFetchResult: UIBackgroundFetchResult) => void) => {
    const d = toJsObject(data);

    const notification = <TNSPushNotification>{
      title: d.title,
      message: d.message,
      ios: data,
      data: {}
    };

    if (d.aps) {
      notification.aps = {
        alert: d.aps.alert,
        badge: d.aps.badge,
        sound: d.aps.sound
      };
    }

    Object.keys(d).forEach(key => {
      if (key !== "aps" && key !== "title" && key !== "message") {
        notification.data[key] = d[key];
      }
    });

    pendingNotifications.push(notification);
    processPendingNotifications();
    completionHandler(UIBackgroundFetchResult.NewData);
  });
};

if (UIApplication.sharedApplication) {
  wireNotificationHandler();
} else {
  application.on("launch", () => wireNotificationHandler());
}

function toJsObject(dictionary: NSDictionary<any, any>) {
  if (dictionary === null || typeof dictionary !== "object") {
    return dictionary;
  }
  let node, key, i, l,
      oKeyArr = dictionary.allKeys;

   if (oKeyArr !== undefined) {
    // object
    node = {};
    for (i = 0, l = oKeyArr.count; i < l; i++) {
      key = oKeyArr.objectAtIndex(i);
      const val = dictionary.valueForKey(key);

      if (val === null) {
        node[key] = null;
        continue;
      }
      node[key] = getValueForClass(val);
    }

  } else {
    node = getValueForClass(dictionary);
  }

  return node;
}

function getValueForClass(val) {
  switch (getClass(val)) {
    case "NSDictionary":
    case "NSMutableDictionary":
      return toJsObject(val);
    case "Boolean":
      return val;
    case "Number":
    case "NSDecimalNumber":
      return Number(String(val));
    case "Date":
      return new Date(val);
    default:
      return String(val);
  }
}

export function getDevicePushToken(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (latestDevicePushTokenError) {
      reject(latestDevicePushTokenError);
    } else if (latestDevicePushToken) {
      resolve(latestDevicePushToken);
    } else {
      // keep the promise around, and resolve when we actually have the token
      getDevicePushTokenResolve = resolve;
      getDevicePushTokenReject = reject;
    }
  });
}

export function setNotificationHandler(handler: (notification: TNSPushNotification) => void): void {
  notificationHandler = handler;
  while (pendingNotifications.length > 0) {
    notificationHandler(pendingNotifications.pop());
  }
  processPendingNotifications();
}

const processPendingNotifications = (): void => {
  if (notificationHandler) {
    while (pendingNotifications.length > 0) {
      notificationHandler(pendingNotifications.pop());
    }
  }
};
